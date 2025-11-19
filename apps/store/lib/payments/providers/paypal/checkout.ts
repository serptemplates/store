import logger from "@/lib/logger";
import { normalizePayPalAccountAlias } from "@/config/payment-accounts";
import { ensureMetadataCaseVariants, getMetadataString } from "@/lib/metadata/metadata-access";
import type { CheckoutRequest, CheckoutResponse, PaymentProviderAdapter } from "@/lib/payments/providers/base";
import { createPayPalOrder, resolvePayPalModeForRuntime, type PayPalMode } from "@/lib/payments/paypal/api";

type PayPalMetadata = Record<string, string | null | undefined>;

function readMetadata(metadata: PayPalMetadata, key: string): string | null {
  return getMetadataString(metadata, key);
}

function inflightKey(metadata: PayPalMetadata, mode: PayPalMode, suffix: string): string {
  return mode === "test" ? `paypal_test_${suffix}` : `paypal_live_${suffix}`;
}

function parseAmountCents(metadata: PayPalMetadata, mode: PayPalMode): number | null {
  const envKey = inflightKey(metadata, mode, "amount_cents");
  const fallbackKey = "paypal_amount_cents";
  const value = readMetadata(metadata, envKey) ?? readMetadata(metadata, fallbackKey);
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseCurrency(metadata: PayPalMetadata, mode: PayPalMode): string {
  const envKey = inflightKey(metadata, mode, "currency");
  const fallbackKey = "paypal_currency";
  const value = readMetadata(metadata, envKey) ?? readMetadata(metadata, fallbackKey);
  if (!value) {
    return "USD";
  }
  return value.trim().toUpperCase();
}

function parseDescription(metadata: PayPalMetadata, request: CheckoutRequest): string {
  const explicit = readMetadata(metadata, "paypal_description");
  if (explicit) {
    return explicit;
  }
  const productName = request.metadata?.productName ?? request.metadata?.product_name;
  if (typeof productName === "string" && productName.trim().length > 0) {
    return productName.trim();
  }
  return request.slug;
}

function parseBrand(metadata: PayPalMetadata, request: CheckoutRequest): string {
  const explicit = readMetadata(metadata, "paypal_brand_name");
  if (explicit) {
    return explicit;
  }
  const fromMetadata = request.metadata?.brand ?? request.metadata?.productName;
  if (typeof fromMetadata === "string" && fromMetadata.trim().length > 0) {
    return fromMetadata.trim();
  }
  return "SERP Apps";
}

function sanitizeUrl(value: string): string {
  if (!value) return value;
  return value.replace("{CHECKOUT_SESSION_ID}", "");
}

function appendPayPalParams(value: string, params: Record<string, string | null | undefined>): string {
  const sanitized = sanitizeUrl(value);
  try {
    const url = new URL(sanitized);
    if (url.searchParams.has("session_id")) {
      url.searchParams.delete("session_id");
    }
    for (const [key, entry] of Object.entries(params)) {
      if (entry && entry.length > 0) {
        url.searchParams.set(key, entry);
      }
    }
    return url.toString();
  } catch {
    return sanitized;
  }
}

export const paypalCheckoutAdapter: PaymentProviderAdapter = {
  id: "paypal",
  async createCheckout(request: CheckoutRequest): Promise<CheckoutResponse> {
    const providerMetadata = ensureMetadataCaseVariants(
      (request.providerConfig?.metadata ?? {}) as Record<string, unknown>,
    ) as PayPalMetadata;

    const mode = resolvePayPalModeForRuntime();
    const amountCents = parseAmountCents(providerMetadata, mode);

    if (!amountCents) {
      throw new Error(
        `PayPal metadata missing ${
          mode === "test" ? "paypal_test_amount_cents" : "paypal_live_amount_cents"
        } for ${request.slug}`,
      );
    }

    const currency = parseCurrency(providerMetadata, mode);
    const description = parseDescription(providerMetadata, request);
    const brand = parseBrand(providerMetadata, request);
    const accountAlias = request.paymentAccountAlias ?? null;
    const normalizedAlias = normalizePayPalAccountAlias(accountAlias ?? undefined);

    const purchaseUnit = {
      reference_id: request.slug,
      custom_id: request.slug,
      description,
      invoice_id: `${request.slug}-${Date.now()}`,
      amount: {
        currency_code: currency,
        value: (amountCents / 100).toFixed(2),
      },
    };

    const applicationContext = {
      brand_name: brand,
      return_url: appendPayPalParams(request.successUrl, {
        provider: "paypal",
        paypal_mode: mode,
        paypal_account: normalizedAlias,
      }),
      cancel_url: appendPayPalParams(request.cancelUrl, {
        provider: "paypal",
        paypal_mode: mode,
        paypal_account: normalizedAlias,
      }),
      user_action: "PAY_NOW",
      shipping_preference: "NO_SHIPPING",
    };

    const intent = request.mode === "subscription" ? "AUTHORIZE" : "CAPTURE";

    const {
      order,
      resolvedAlias,
    } = await createPayPalOrder({
      payload: {
        intent,
        purchase_units: [purchaseUnit],
        application_context: applicationContext,
      },
      accountAlias,
      mode,
    });

    const approvalLink = order.links?.find((link) => link.rel === "approve");
    if (!approvalLink?.href) {
      logger.error("paypal.checkout.missing_approval_link", {
        orderId: order.id,
        slug: request.slug,
      });
      throw new Error("PayPal order missing approval URL");
    }

    logger.info("paypal.checkout.order_created", {
      orderId: order.id,
      slug: request.slug,
      providerMode: mode,
      providerAccountAlias: resolvedAlias,
    });

    return {
      provider: "paypal",
      redirectUrl: approvalLink.href,
      sessionId: order.id,
      providerSessionId: order.id,
    };
  },
};
