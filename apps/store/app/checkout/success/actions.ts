"use server";

import type Stripe from "stripe";

import { getStripeClient } from "@/lib/payments/stripe";
import {
  capturePayPalOrder,
  resolvePayPalModeForRuntime,
  type PayPalMode,
} from "@/lib/payments/paypal/api";
import {
  findCheckoutSessionByStripeSessionId,
  findOrderByPaymentIntentId,
  findLatestGhlOrder,
} from "@/lib/checkout";
import { getOfferConfig } from "@/lib/products/offer-config";
import { getProductData } from "@/lib/products/product";
import { processFulfilledOrder, type NormalizedOrder } from "@/lib/payments/order-fulfillment";
import logger from "@/lib/logger";
import { ensureMetadataCaseVariants, getMetadataString } from "@/lib/metadata/metadata-access";
import { handlePayPalWebhookEvent } from "@/lib/payments/providers/paypal/webhook";
import { resolveProductPrice } from "@/lib/pricing/price-manifest";

type ProcessedOrderDetails = {
  sessionId: string;
  amount: number | null;
  currency: string | null;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  coupon?: string | null;
  affiliateId?: string | null;
  productSlug?: string | null;
  customerEmail?: string | null;
};

type ProcessCheckoutResult = {
  success: boolean;
  message?: string;
  order?: ProcessedOrderDetails;
};

type PayPalProcessInput = {
  orderId: string;
  accountAlias?: string | null;
  mode?: PayPalMode | null;
};

function coerceMetadataString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Process a checkout session after successful payment.
 * This is a fallback for development environments where webhooks may not be configured.
 * In production, this is redundant with the webhook but provides idempotency.
 */
export async function processCheckoutSession(sessionId: string): Promise<ProcessCheckoutResult> {
  try {
    const stripe = getStripeClient();
    
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "payment_intent"],
    });

    if (session.payment_status !== "paid") {
      return {
        success: false,
        message: "Payment not completed",
      };
    }

    // Check if we've already processed this session
    const existingSession = await findCheckoutSessionByStripeSessionId(sessionId);
    const alreadyProcessed = existingSession?.metadata?.processedAt;

    const metadata = ensureMetadataCaseVariants((session.metadata ?? {}) as Record<string, unknown>, {
      mirror: "snake",
    });

    const metadataOfferId = getMetadataString(metadata, "offer_id");
    const productSlug = getMetadataString(metadata, "product_slug");
    const offerId =
      metadataOfferId ??
      productSlug ??
      coerceMetadataString(session.client_reference_id) ??
      null;

    if (!offerId) {
      logger.error("checkout.success.missing_offer_id", {
        sessionId,
        metadata,
        clientReferenceId: session.client_reference_id,
      });
      return {
        success: false,
        message: "Missing product information",
      };
    }

    const landerId =
      getMetadataString(metadata, "lander_id") ??
      productSlug ??
      offerId;
    const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    if (!customerEmail) {
      return {
        success: false,
        message: "Missing customer email",
      };
    }

    const augmentedMetadata: Record<string, unknown> = ensureMetadataCaseVariants(
      {
        ...metadata,
      },
      { mirror: "snake" },
    );

    // Populate payment description fields similar to webhook path
    const coerce = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    let productNameValue = coerce((metadata as Record<string, unknown>)["product_name"]) ||
      coerce((metadata as Record<string, unknown>)["productName"]);

    if (!productNameValue) {
      const lineItem = (session.line_items as Stripe.ApiList<Stripe.LineItem> | null | undefined)?.data?.[0];
      const priceProduct = lineItem?.price?.product;
      if (priceProduct && typeof priceProduct === "object" && "deleted" in priceProduct) {
        // ignore deleted product objects
      } else if (priceProduct && typeof priceProduct === "object" && "name" in priceProduct) {
        const candidate = coerce((priceProduct as Stripe.Product).name);
        if (candidate) productNameValue = candidate;
      } else if (typeof priceProduct === "string") {
        // no-op
      } else if (lineItem?.description) {
        const candidate = coerce(lineItem.description);
        if (candidate) productNameValue = candidate;
      }
    }

    if (!productNameValue) {
      try {
        const offerConfig = getOfferConfig(offerId);
        const candidate = coerce(offerConfig?.productName);
        if (candidate) productNameValue = candidate;
      } catch {
        // ignore offer config fallback failure
      }
    }

    if (productNameValue) {
      if (!coerce(augmentedMetadata["payment_description"])) {
        augmentedMetadata.payment_description = productNameValue;
      }
      if (!coerce(augmentedMetadata["description"])) {
        augmentedMetadata.description = productNameValue;
      }
    }

    const tosStatus = session.consent?.terms_of_service ?? null;
    if (tosStatus) {
      augmentedMetadata.stripeTermsOfService = tosStatus;
      if (tosStatus === "accepted") {
        augmentedMetadata.tosAccepted = "true";
      } else if (tosStatus === "declined") {
        augmentedMetadata.tosAccepted = "false";
      }
    }

    const tosRequirement = session.consent_collection?.terms_of_service ?? null;
    if (tosRequirement) {
      augmentedMetadata.stripeTermsOfServiceRequirement = tosRequirement;
    }

    if (productSlug) {
      if (!augmentedMetadata.product_slug) {
        augmentedMetadata.product_slug = productSlug;
      }
    }

    augmentedMetadata.processedAt = new Date().toISOString();

    const providerAccountAlias =
      getMetadataString(augmentedMetadata, "payment_provider_account")
        ?? getMetadataString(augmentedMetadata, "payment_provider_account_alias")
        ?? null;

    const providerMode = typeof session.livemode === "boolean"
      ? session.livemode ? "live" : "test"
      : null;

    const normalizedOrder: NormalizedOrder = {
      provider: "stripe",
      providerAccountAlias,
      providerMode,
      providerSessionId: session.id,
      providerPaymentId: paymentIntentId,
      sessionId,
      paymentIntentId,
      offerId,
      landerId,
      productSlug: productSlug ?? offerId,
      productName: productNameValue ?? offerId,
      customerEmail,
      customerName: session.customer_details?.name ?? null,
      customerPhone: session.customer_details?.phone ?? null,
      clientReferenceId: session.client_reference_id ?? null,
      metadata: augmentedMetadata,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
      paymentStatus: session.payment_status ?? null,
      paymentMethod: session.payment_method_types?.[0] ?? null,
      resolvedGhlTagIds: resolveGhlTagIds(augmentedMetadata),
      urls: resolveOrderUrls(augmentedMetadata),
      tosAccepted: augmentedMetadata.tosAccepted === "true" ? true : augmentedMetadata.tosAccepted === "false" ? false : null,
      skipSideEffects: Boolean(alreadyProcessed),
    };

    await processFulfilledOrder(normalizedOrder);

    const orderAmount =
      typeof session.amount_total === "number"
        ? Number((session.amount_total / 100).toFixed(2))
        : null;

    const orderItems =
      session.line_items?.data?.map((line) => {
        const quantity = line.quantity ?? 1;
        const lineTotal =
          typeof line.amount_total === "number"
            ? Number((line.amount_total / 100).toFixed(2))
            : null;
        const unitAmountFromTotal =
          lineTotal !== null && quantity > 0
            ? Number((lineTotal / quantity).toFixed(2))
            : null;
        const unitAmountFromPrice =
          typeof line.price?.unit_amount === "number"
            ? Number((line.price.unit_amount / 100).toFixed(2))
            : null;
        const resolvedUnitAmount = unitAmountFromTotal ?? unitAmountFromPrice;
        const resolvedLineTotal =
          lineTotal ?? (resolvedUnitAmount !== null ? Number((resolvedUnitAmount * quantity).toFixed(2)) : null);

        const fallbackProductName =
          getMetadataString(augmentedMetadata, "product_name") ??
          getMetadataString(augmentedMetadata, "offer_name") ??
          offerId ??
          "Product";

        const lineName =
          line.description ??
          (typeof line.price?.product === "string" ? line.price.product : null) ??
          fallbackProductName;

        const fallbackProductSlug =
          getMetadataString(augmentedMetadata, "product_slug") ??
          offerId ??
          sessionId;

        const lineId =
          (typeof line.price?.product === "string" ? line.price.product : null) ??
          fallbackProductSlug;

        return {
          id: lineId,
          name: lineName,
          price: resolvedUnitAmount ?? resolvedLineTotal ?? 0,
          quantity,
        };
      }) ?? [
        {
          id: getMetadataString(augmentedMetadata, "product_slug") ?? offerId ?? sessionId,
          name: getMetadataString(augmentedMetadata, "product_name") ?? offerId ?? "Product",
          price: orderAmount ?? 0,
          quantity: 1,
        },
      ];

    const couponCode =
      typeof augmentedMetadata.couponCode === "string"
        ? (augmentedMetadata.couponCode as string)
        : undefined;

    const affiliateIdValue =
      typeof augmentedMetadata.affiliateId === "string"
        ? (augmentedMetadata.affiliateId as string)
        : undefined;

    return {
      success: true,
      message: "Order processed successfully",
      order: {
        sessionId,
        amount: orderAmount,
        currency: session.currency ?? null,
        items: orderItems,
        coupon: couponCode,
        affiliateId: affiliateIdValue,
        productSlug: productSlug ?? offerId ?? null,
        customerEmail,
      },
    };
  } catch (error) {
    logger.error("checkout.success.process_error", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to process order",
    };
  }
}

export async function processPayPalCheckout(input: PayPalProcessInput): Promise<ProcessCheckoutResult> {
  if (!input.orderId) {
    return { success: false, message: "Missing PayPal order token" };
  }

  const mode: PayPalMode = input.mode === "live" || input.mode === "test" ? input.mode : resolvePayPalModeForRuntime();

  try {
    const capture = await capturePayPalOrder({
      orderId: input.orderId,
      accountAlias: input.accountAlias ?? null,
      mode,
    });

    const normalizedOrder = await handlePayPalWebhookEvent(
      {
        id: `paypal-local-${input.orderId}`,
        event_type: "PAYPAL.CHECKOUT.SUCCESS",
        resource: capture as Record<string, unknown>,
      },
      {
        accountAlias: input.accountAlias ?? null,
        mode,
      },
    );

    return {
      success: true,
      order: {
        sessionId: normalizedOrder.sessionId,
        amount: normalizedOrder.amountTotal ?? null,
        currency: normalizedOrder.currency ?? null,
        customerEmail: normalizedOrder.customerEmail ?? null,
        items: [
          {
            id: normalizedOrder.offerId,
            name: normalizedOrder.productName ?? normalizedOrder.offerId,
            price:
              typeof normalizedOrder.amountTotal === "number" ? normalizedOrder.amountTotal / 100 : 0,
            quantity: 1,
          },
        ],
        productSlug: normalizedOrder.productSlug ?? normalizedOrder.offerId,
      },
    };
  } catch (error) {
    logger.error("paypal.success.processing_failed", {
      orderId: input.orderId,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return { success: false, message: "Failed to process PayPal order" };
  }
}

type ProcessGhlPaymentParams = {
  paymentId?: string | null;
  productSlug?: string | null;
};

function normalizeGhlPaymentId(rawId: string | null | undefined): string | null {
  if (!rawId) {
    return null;
  }

  const trimmed = rawId.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("ghl_") ? trimmed : `ghl_${trimmed}`;
}

function coerceCurrency(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }

  const trimmed = code.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

function parseSerializedList(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter((entry) => entry.length > 0);
      }
    } catch {
      // ignore JSON parse failure
    }
  }

  return trimmed
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function resolveGhlTagIds(metadata: Record<string, unknown>): string[] | undefined {
  const tags = new Set<string>();
  const append = (value: unknown) => {
    if (typeof value !== "string") {
      return;
    }
    const trimmed = value.trim();
    if (trimmed) {
      tags.add(trimmed);
    }
  };

  append(metadata.ghl_tag);

  return tags.size > 0 ? Array.from(tags) : undefined;
}

function readMetadataUrl(metadata: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return null;
}

function normalizeStoreProductUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(
    /^https:\/\/store\.serp\.co\/product-details\/product\//,
    "https://apps.serp.co/",
  );
  if (normalized !== value) {
    return normalized;
  }

  return value.replace(/^https:\/\/store\.serp\.co\//, "https://apps.serp.co/");
}

function resolveOrderUrls(metadata: Record<string, unknown>) {
  const productPageUrl = normalizeStoreProductUrl(readMetadataUrl(
    metadata,
    "product_page_url",
    "productPageUrl",
    "apps_serp_co_product_page_url",
    "store_serp_co_product_page_url",
  ));
  const purchaseUrl = readMetadataUrl(metadata, "purchase_url", "purchaseUrl", "serply_link");
  const storeProductPageUrl = normalizeStoreProductUrl(
    readMetadataUrl(metadata, "store_serp_co_product_page_url", "storeProductPageUrl"),
  );
  const appsProductPageUrl = normalizeStoreProductUrl(
    readMetadataUrl(metadata, "apps_serp_co_product_page_url", "appsProductPageUrl"),
  );
  const serplyLink = readMetadataUrl(metadata, "serply_link", "serplyLink");
  const successUrl = readMetadataUrl(metadata, "success_url", "successUrl");
  const cancelUrl = readMetadataUrl(metadata, "cancel_url", "cancelUrl");

  if (
    !productPageUrl &&
    !purchaseUrl &&
    !storeProductPageUrl &&
    !appsProductPageUrl &&
    !serplyLink &&
    !successUrl &&
    !cancelUrl
  ) {
    return undefined;
  }

  return {
    productPageUrl: productPageUrl ?? undefined,
    purchaseUrl: purchaseUrl ?? undefined,
    storeProductPageUrl: storeProductPageUrl ?? undefined,
    appsProductPageUrl: appsProductPageUrl ?? undefined,
    serplyLink: serplyLink ?? undefined,
    successUrl: successUrl ?? undefined,
    cancelUrl: cancelUrl ?? undefined,
  };
}

export async function processGhlPayment(params: ProcessGhlPaymentParams): Promise<ProcessCheckoutResult> {
  const normalizedPaymentId = normalizeGhlPaymentId(params.paymentId);
  const trimmedSlug = params.productSlug?.trim();

  try {
    let order = normalizedPaymentId ? await findOrderByPaymentIntentId(normalizedPaymentId) : null;

    if (!order && trimmedSlug) {
      order = await findLatestGhlOrder({
        offerId: trimmedSlug,
        excludePaymentIntentId: normalizedPaymentId,
      });

      if (order) {
        logger.info("checkout.success.ghl_fallback_order_match", {
          offerId: trimmedSlug,
          paymentIntentId: order.stripePaymentIntentId,
        });
      }
    }

    const resolvedSlug = order?.offerId ?? trimmedSlug ?? null;

    let product: ReturnType<typeof getProductData> | null = null;
    if (resolvedSlug) {
      try {
        product = getProductData(resolvedSlug);
      } catch {
        product = null;
      }
    }

    if (!order && !product) {
      return {
        success: false,
        message: "Unable to locate GHL purchase information.",
      };
    }

    const priceDetails = product ? resolveProductPrice(product) : null;

    const amountMajorUnits =
      order?.amountTotal != null
        ? Number((order.amountTotal / 100).toFixed(2))
        : priceDetails?.amount ?? null;

    const resolvedCurrency =
      coerceCurrency(order?.currency) ??
      (priceDetails ? coerceCurrency(priceDetails.currency) : null);

    const metadata = (order?.metadata ?? {}) as Record<string, unknown>;
    const ghlMeta = (metadata.ghl as Record<string, unknown> | undefined) ?? undefined;
    const customData = (ghlMeta?.customData as Record<string, unknown> | undefined) ?? undefined;

    const couponCode =
      (typeof metadata.couponCode === "string" ? metadata.couponCode : undefined) ??
      (typeof ghlMeta?.couponCode === "string" ? (ghlMeta.couponCode as string) : undefined);

    const affiliateIdFromMetadata =
      (typeof metadata.affiliateId === "string" ? metadata.affiliateId : undefined) ??
      (typeof ghlMeta?.affiliateId === "string" ? (ghlMeta.affiliateId as string) : undefined);

    const affiliateIdFromCustomData =
      (customData && typeof customData.affiliateId === "string"
        ? (customData.affiliateId as string)
        : customData && typeof customData.affiliate_id === "string"
        ? (customData.affiliate_id as string)
        : undefined);

    const affiliateId = affiliateIdFromMetadata ?? affiliateIdFromCustomData ?? null;

    const itemId =
      product?.slug ??
      order?.offerId ??
      resolvedSlug ??
      normalizedPaymentId ??
      "ghl-purchase";

    const itemName =
      product?.name ??
      getMetadataString(metadata, "product_name") ??
      getMetadataString(ghlMeta as Record<string, unknown> | undefined, "product_name") ??
      "SERP Purchase";

    const resolvedPrice = amountMajorUnits ?? priceDetails?.amount ?? 0;

    const items: ProcessedOrderDetails["items"] = [
      {
        id: itemId,
        name: itemName,
        price: resolvedPrice,
        quantity: 1,
      },
    ];

    const sessionId =
      order?.stripePaymentIntentId ??
      order?.stripeSessionId ??
      normalizedPaymentId ??
      (resolvedSlug ? `ghl_${resolvedSlug}_${Date.now()}` : `ghl_${Date.now()}`);

    return {
      success: true,
      message: "GHL purchase processed",
      order: {
        sessionId,
        amount: amountMajorUnits ?? resolvedPrice ?? null,
        currency: resolvedCurrency ?? null,
        items,
        coupon: couponCode ?? null,
        affiliateId,
        customerEmail: order?.customerEmail ?? null,
      },
    };
  } catch (error) {
    logger.error("checkout.success.ghl_process_error", {
      paymentId: normalizedPaymentId,
      productSlug: params.productSlug,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to process GHL order",
    };
  }
}
