import logger from "@/lib/logger";

import type { GhlSyncContext } from "./types";

export function splitName(name: string | null | undefined) {
  if (!name) return { firstName: undefined, lastName: undefined };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: undefined };
  }
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) };
}

export function renderTemplate(template: string | undefined, context: Record<string, unknown>, fallback: string): string {
  if (!template) return fallback;
  return (
    template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => {
      const value = context[key as keyof typeof context];
      return value === undefined || value === null ? "" : String(value);
    }) || fallback
  );
}

export function compactObject(input: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }
      result[key] = value;
      continue;
    }

    if (typeof value === "object") {
      const nested = compactObject(value as Record<string, unknown>);
      if (Object.keys(nested).length === 0) {
        continue;
      }
      result[key] = nested;
      continue;
    }

    if (typeof value === "string" && value.trim().length === 0) {
      continue;
    }

    result[key] = value;
  }

  return result;
}

export function buildPurchaseMetadata(context: GhlSyncContext): string | undefined {
  const amountDecimal = typeof context.amountTotal === "number"
    ? Number((context.amountTotal / 100).toFixed(2))
    : undefined;

  const productPageUrl = context.productPageUrl
    ?? context.storeProductPageUrl
    ?? context.appsProductPageUrl
    ?? context.metadata?.productPageUrl
    ?? context.metadata?.product_page_url
    ?? context.metadata?.store_serp_co_product_page_url
    ?? context.metadata?.apps_serp_co_product_page_url
    ?? context.metadata?.productPageURL;

  const checkoutUrl = context.purchaseUrl
    ?? context.metadata?.purchaseUrl
    ?? context.metadata?.purchase_url
    ?? context.metadata?.serply_link
    ?? context.metadata?.serplyLink
    ?? context.serplyLink
    ?? context.metadata?.checkoutUrl
    ?? context.metadata?.checkout_url;

  const metadataPayload = context.metadata && Object.keys(context.metadata).length > 0
    ? context.metadata
    : undefined;

  const licenseDetails = context.licenseKey
    || (context.licenseEntitlements && context.licenseEntitlements.length > 0)
    || context.licenseId
    || context.licenseAction
    ? compactObject({
        key: context.licenseKey ?? undefined,
        id: context.licenseId ?? undefined,
        action: context.licenseAction ?? undefined,
        entitlements: context.licenseEntitlements ?? undefined,
        tier: context.licenseTier ?? undefined,
        features: context.licenseFeatures && Object.keys(context.licenseFeatures).length > 0
          ? context.licenseFeatures
          : undefined,
      })
    : undefined;

  const payload = compactObject({
    provider: context.provider ?? undefined,
    product: compactObject({
      id: context.offerId,
      name: context.offerName,
      pageUrl: productPageUrl ?? undefined,
      purchaseUrl: checkoutUrl ?? undefined,
      landerId: context.landerId ?? undefined,
    }),
    customer: compactObject({
      email: context.customerEmail,
      name: context.customerName ?? undefined,
      phone: context.customerPhone ?? undefined,
    }),
    payment: compactObject({
      amountCents: typeof context.amountTotal === "number" ? context.amountTotal : undefined,
      amount: amountDecimal,
      amountFormatted: context.amountFormatted ?? undefined,
      currency: context.currency ?? undefined,
      stripeSessionId: context.stripeSessionId ?? undefined,
      stripePaymentIntentId: context.stripePaymentIntentId ?? undefined,
    }),
    consent:
      context.tosAccepted === undefined
        ? undefined
        : {
            termsOfServiceAccepted: context.tosAccepted,
          },
    metadata: metadataPayload,
    license: licenseDetails,
  });

  if (Object.keys(payload).length === 0) {
    return undefined;
  }

  try {
    return JSON.stringify(payload, null, 2);
  } catch (error) {
    logger.error("ghl.purchase_metadata_stringify_failed", {
      offerId: context.offerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

export function buildLicenseKeysPayload(context: GhlSyncContext): string | undefined {
  const hasLicenseData = Boolean(
    context.licenseKey
      || context.licenseId
      || context.licenseAction
      || (context.licenseEntitlements && context.licenseEntitlements.length > 0),
  );

  if (!hasLicenseData) {
    return undefined;
  }

  const payload = compactObject({
    key: context.licenseKey ?? undefined,
    id: context.licenseId ?? undefined,
    action: context.licenseAction ?? undefined,
    entitlements: context.licenseEntitlements ?? undefined,
    tier: context.licenseTier ?? undefined,
  });

  try {
    return JSON.stringify(payload, null, 2);
  } catch (error) {
    logger.error("ghl.license_keys_payload_stringify_failed", {
      offerId: context.offerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}
