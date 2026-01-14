import logger from "@/lib/logger";
import type { NormalizedOrder } from "@/lib/payments/order-fulfillment";
import { processFulfilledOrder } from "@/lib/payments/order-fulfillment";
import type { PayPalMode } from "@/lib/payments/paypal/api";
import { getPayPalOrderDetails } from "@/lib/payments/paypal/api";
import { ensureMetadataCaseVariants } from "@/lib/metadata/metadata-access";
import { getOfferConfig } from "@/lib/products/offer-config";

type PayPalAmount = {
  value?: string | number;
  currency_code?: string;
};

type PayPalPurchaseUnit = {
  reference_id?: string;
  custom_id?: string;
  amount?: PayPalAmount;
};

type PayPalPayer = {
  email_address?: string;
  payer_info?: {
    email?: string;
  };
  name?: {
    given_name?: string;
    surname?: string;
  };
};

type PayPalResource = {
  id?: string;
  amount?: PayPalAmount;
  purchase_units?: PayPalPurchaseUnit[];
  purchase_unit?: PayPalPurchaseUnit;
  payer?: PayPalPayer;
  seller_receivable_breakdown?: {
    gross_amount?: PayPalAmount;
  };
  supplementary_data?: {
    related_ids?: {
      order_id?: string;
    };
  };
  status?: string;
};

export type PayPalWebhookContext = {
  accountAlias: string | null;
  mode: PayPalMode;
};

export type PayPalWebhookEvent = {
  id: string;
  event_type?: string;
  resource_type?: string;
  resource?: PayPalResource;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }
  if (typeof value === "string") {
    const normalized = Number.parseFloat(value);
    if (Number.isFinite(normalized)) {
      return Math.round(normalized * 100);
    }
  }
  return null;
}

function firstPurchaseUnit(resource: PayPalResource | undefined | null): PayPalPurchaseUnit | null {
  if (!resource) {
    return null;
  }

  if (Array.isArray(resource.purchase_units) && resource.purchase_units.length > 0) {
    return resource.purchase_units[0] ?? null;
  }

  const singleUnit = resource.purchase_unit;
  if (singleUnit && typeof singleUnit === "object") {
    return singleUnit;
  }

  return null;
}

function resolveOrderId(resource: PayPalResource | undefined): string | null {
  if (!resource) return null;
  const relatedOrderId = resource?.supplementary_data?.related_ids?.order_id;
  if (asString(relatedOrderId)) {
    return asString(relatedOrderId);
  }
  const referenceId = firstPurchaseUnit(resource)?.reference_id;
  if (asString(referenceId)) {
    return asString(referenceId);
  }
  if (asString(resource.id)) {
    return asString(resource.id);
  }
  return null;
}

function resolveSlug(resource: PayPalResource | undefined): string | null {
  const purchaseUnit = firstPurchaseUnit(resource);
  const customId = asString(purchaseUnit?.custom_id);
  if (customId) {
    return customId;
  }
  const referenceId = asString(purchaseUnit?.reference_id);
  if (referenceId) {
    return referenceId;
  }
  return null;
}

function buildCustomerName(resource: PayPalResource | undefined): string | null {
  const payer = resource?.payer;
  if (!payer) return null;
  const given = asString(payer.name?.given_name);
  const surname = asString(payer.name?.surname);
  if (given && surname) {
    return `${given} ${surname}`.trim();
  }
  return given ?? surname ?? null;
}

function resolveCurrency(resource: PayPalResource | undefined): string | null {
  const purchaseUnit = firstPurchaseUnit(resource);
  const currency = purchaseUnit?.amount?.currency_code ?? resource?.amount?.currency_code;
  if (typeof currency === "string" && currency.trim().length > 0) {
    return currency.trim().toUpperCase();
  }
  return null;
}

function resolveAmount(resource: PayPalResource | undefined): number | null {
  const purchaseUnit = firstPurchaseUnit(resource);
  const value =
    purchaseUnit?.amount?.value ??
    resource?.amount?.value ??
    resource?.seller_receivable_breakdown?.gross_amount?.value;
  return parseAmount(value);
}

function normalizeMetadata(base: Record<string, unknown> | undefined, additions: Record<string, unknown>): Record<string, unknown> {
  const merged = ensureMetadataCaseVariants({ ...(base ?? {}) }, { mirror: "snake" });
  for (const [key, value] of Object.entries(additions)) {
    if (value === undefined || value === null) continue;
    merged[key] = value;
  }
  return merged;
}

export async function handlePayPalWebhookEvent(
  event: PayPalWebhookEvent,
  context: PayPalWebhookContext,
): Promise<NormalizedOrder> {
  const resource = event.resource ?? {};
  const orderId = resolveOrderId(resource);
  const slugFromEvent = resolveSlug(resource);

  let orderDetails: PayPalResource | null = null;
  let slug = slugFromEvent;

  if (!slug && orderId) {
    try {
      orderDetails = await getPayPalOrderDetails({
        orderId,
        accountAlias: context.accountAlias,
        mode: context.mode,
      });
      slug = resolveSlug(orderDetails ?? undefined) ?? slug;
    } catch (error) {
      logger.error("paypal.webhook.order_details_failed", {
        orderId,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
    }
  }

  if (!slug) {
    logger.error("paypal.webhook.missing_slug", {
      eventId: event.id,
      orderId,
    });
    throw new Error("Unable to determine product slug from PayPal event");
  }

  const amountTotal = resolveAmount(resource) ?? resolveAmount(orderDetails ?? undefined) ?? null;
  const currency = resolveCurrency(resource) ?? resolveCurrency(orderDetails ?? undefined) ?? null;
  const captureId = asString(resource?.id);

  const offer = getOfferConfig(slug);

  const metadata = normalizeMetadata(offer?.metadata, {
    paypal_event_id: event.id,
    paypal_event_type: event.event_type ?? null,
    paypal_order_id: orderId,
    paypal_capture_id: captureId,
  });
  const metadataRecord = metadata as Record<string, unknown>;
  const metadataString = (key: string) => asString(metadataRecord[key]);
  const normalizeStoreProductUrl = (value: string | null): string | null => {
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
  };

  const normalizedOrder: NormalizedOrder = {
    provider: "paypal",
    providerAccountAlias: context.accountAlias ?? null,
    providerMode: context.mode,
    providerSessionId: orderId ?? event.id,
    providerPaymentId: captureId ?? null,
    sessionId: orderId ?? event.id,
    offerId: slug,
    landerId: slug,
    productSlug: slug,
    productName: offer?.productName ?? slug,
    customerEmail:
      asString(resource?.payer?.email_address) ??
      asString(resource?.payer?.payer_info?.email) ??
      null,
    customerName: buildCustomerName(resource),
    metadata,
    amountTotal,
    currency,
    paymentStatus: asString(resource?.status),
    clientReferenceId: null,
    resolvedGhlTagIds: offer?.ghl?.tagIds ?? [],
    urls: {
      productPageUrl: normalizeStoreProductUrl(
        metadataString("product_page_url")
          ?? metadataString("apps_serp_co_product_page_url")
          ?? metadataString("store_serp_co_product_page_url")
          ?? null,
      ),
      purchaseUrl: metadataString("purchase_url") ?? metadataString("serply_link") ?? null,
      appsProductPageUrl: normalizeStoreProductUrl(
        metadataString("apps_serp_co_product_page_url") ?? null,
      ),
      storeProductPageUrl: normalizeStoreProductUrl(
        metadataString("store_serp_co_product_page_url") ?? null,
      ),
      serplyLink: metadataString("serply_link") ?? null,
      successUrl: metadataString("success_url") ?? null,
      cancelUrl: metadataString("cancel_url") ?? null,
    },
  };

  try {
    await processFulfilledOrder(normalizedOrder);
    logger.info("paypal.webhook.order_processed", {
      eventId: event.id,
      orderId: normalizedOrder.sessionId,
      slug,
      providerMode: context.mode,
      providerAccountAlias: context.accountAlias ?? null,
    });
  } catch (error) {
    logger.error("paypal.webhook.order_processing_failed", {
      eventId: event.id,
      orderId: normalizedOrder.sessionId,
      slug,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    throw error;
  }

  return normalizedOrder;
}
