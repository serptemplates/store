import logger from "@/lib/logger";
import { ensureAccountForPurchase } from "@/lib/account/service";
import {
  upsertCheckoutSession,
  upsertOrder,
  updateCheckoutSessionStatus,
  updateOrderMetadata,
} from "@/lib/checkout";
import { createLicenseForOrder } from "@/lib/license-service";
import { getOfferConfig } from "@/lib/products/offer-config";
import type { PaymentProviderId } from "@/lib/products/payment";
import { syncOrderWithGhlWithRetry } from "@/lib/payments/stripe-webhook/helpers/ghl-sync";
import { upsertSerpAuthEntitlements } from "@/lib/serp-auth/d1-client";

type LicenseResult = Awaited<ReturnType<typeof createLicenseForOrder>>;
type GhlSyncResult = Awaited<ReturnType<typeof syncOrderWithGhlWithRetry>>;

export type NormalizedOrderLicense = {
  tier?: string | null;
  entitlements?: string[];
  features?: Record<string, unknown>;
};

export type NormalizedOrderUrls = {
  productPageUrl?: string | null;
  purchaseUrl?: string | null;
  storeProductPageUrl?: string | null;
  appsProductPageUrl?: string | null;
  serplyLink?: string | null;
  successUrl?: string | null;
  cancelUrl?: string | null;
};

export type NormalizedOrder = {
  provider: PaymentProviderId;
  providerAccountAlias?: string | null;
  providerMode?: "live" | "test" | null;
  providerSessionId?: string | null;
  providerPaymentId?: string | null;
  providerChargeId?: string | null;
  sessionId: string;
  paymentIntentId?: string | null;
  chargeId?: string | null;
  offerId: string;
  landerId?: string | null;
  productSlug?: string | null;
  productName?: string | null;
  customerEmail: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  clientReferenceId?: string | null;
  metadata: Record<string, unknown>;
  amountTotal?: number | null;
  amountFormatted?: string | null;
  currency?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  resolvedGhlTagIds?: string[];
  urls?: NormalizedOrderUrls;
  license?: NormalizedOrderLicense;
  tosAccepted?: boolean | null;
  skipSideEffects?: boolean;
};

export type ProcessFulfilledOrderResult = {
  checkoutSessionId: string | null;
  licenseResult: LicenseResult;
  licenseConfig: ReturnType<typeof resolveLicenseConfig>;
  ghlResult: {
    status: "synced" | "skipped" | "error";
    result: GhlSyncResult;
    error?: Error | null;
  };
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveLicenseConfig(
  offerMetadata: Record<string, unknown> | undefined,
  fallbackOfferId: string,
  overrides?: NormalizedOrderLicense | null,
) {
  const finalOverrides = overrides ?? {};
  const tierValue = finalOverrides.tier ?? asString(offerMetadata?.licenseTier) ?? fallbackOfferId;

  const entitlementsSet = new Set<string>();
  const entitlementsRaw = finalOverrides.entitlements ?? offerMetadata?.licenseEntitlements;

  if (Array.isArray(entitlementsRaw)) {
    for (const entry of entitlementsRaw) {
      if (entry == null) continue;
      entitlementsSet.add(String(entry));
    }
  }

  if (fallbackOfferId) {
    entitlementsSet.add(fallbackOfferId);
  }

  const features =
    finalOverrides.features ??
    (offerMetadata?.licenseFeatures && typeof offerMetadata.licenseFeatures === "object" && !Array.isArray(offerMetadata.licenseFeatures)
      ? (offerMetadata.licenseFeatures as Record<string, unknown>)
      : {});

  return {
    tier: tierValue ?? null,
    entitlements: Array.from(entitlementsSet),
    features,
  };
}

function resolveAmountFormatted(amount: number | null | undefined, currency: string | null | undefined): string | null {
  if (!amount || !currency) {
    return null;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return null;
  }
}

function normalizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return { ...metadata };
}

function ensureMetadataValues(metadata: Record<string, unknown>, entries: Record<string, unknown>) {
  for (const [key, value] of Object.entries(entries)) {
    if (metadata[key] === undefined && value !== undefined) {
      metadata[key] = value;
    }
  }
}

function serializeMetadataForGhl(metadata: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[key] = String(value);
    }
  }
  return result;
}

export async function processFulfilledOrder(order: NormalizedOrder): Promise<ProcessFulfilledOrderResult> {
  if (order.customerEmail) {
    await ensureAccountForPurchase({
      email: order.customerEmail,
      name: order.customerName ?? null,
      offerId: order.offerId,
    });
  }

  const metadata = normalizeMetadata(order.metadata);
  const providerSessionId = order.providerSessionId ?? order.sessionId;
  const providerPaymentId = order.providerPaymentId ?? order.paymentIntentId ?? null;
  const providerChargeId = order.providerChargeId ?? order.chargeId ?? null;
  const providerMode = order.providerMode ?? null;
  ensureMetadataValues(metadata, {
    product_slug: order.productSlug,
    productSlug: order.productSlug,
    productName: order.productName,
    paymentProvider: order.provider,
    payment_provider: order.provider,
    paymentProviderAccount: order.providerAccountAlias,
    payment_provider_account: order.providerAccountAlias,
    providerSessionId,
    providerPaymentId,
    providerChargeId,
  });

  const landerId = order.landerId ?? order.productSlug ?? order.offerId;
  const checkoutSessionId = await upsertCheckoutSession({
    stripeSessionId: order.sessionId,
    offerId: order.offerId,
    landerId,
    paymentIntentId: order.paymentIntentId ?? null,
     paymentProvider: order.provider,
     providerAccountAlias: order.providerAccountAlias ?? null,
     providerSessionId,
     providerPaymentId,
     providerChargeId,
     providerMode,
    customerEmail: order.customerEmail ?? null,
    metadata,
    status: "completed",
    source: "stripe",
  });

  await upsertOrder({
    checkoutSessionId,
    stripeSessionId: order.sessionId,
    stripePaymentIntentId: order.paymentIntentId ?? null,
    stripeChargeId: order.chargeId ?? null,
     paymentProvider: order.provider,
     providerAccountAlias: order.providerAccountAlias ?? null,
     providerSessionId,
     providerPaymentId,
     providerChargeId,
     providerMode,
    offerId: order.offerId,
    landerId,
    customerEmail: order.customerEmail ?? null,
    customerName: order.customerName ?? null,
    amountTotal: order.amountTotal ?? null,
    currency: order.currency ?? null,
    metadata,
    paymentStatus: order.paymentStatus ?? null,
    paymentMethod: order.paymentMethod ?? null,
    source: "stripe",
  });

  const offerConfig = (() => {
    try {
      return getOfferConfig(order.offerId);
    } catch (error) {
      logger.warn("payments.fulfillment_offer_lookup_failed", {
        offerId: order.offerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  })();

  const licenseConfig = resolveLicenseConfig(offerConfig?.metadata, order.offerId, order.license ?? null);

  if (order.skipSideEffects) {
    return {
      checkoutSessionId,
      licenseResult: null,
      licenseConfig,
      ghlResult: {
        status: "skipped",
        result: null,
      },
    };
  }
  const amountMajorUnits = typeof order.amountTotal === "number" ? Number((order.amountTotal / 100).toFixed(2)) : null;
  const currencyCode = typeof order.currency === "string" ? order.currency.toLowerCase() : null;
  const licenseMetadata: Record<string, unknown> = {
    orderId: order.sessionId,
    paymentIntentId: order.paymentIntentId ?? null,
    providerAccountAlias: order.providerAccountAlias ?? null,
    productSlug: order.productSlug ?? order.offerId,
    productName: order.productName ?? offerConfig?.productName ?? order.offerId,
    amount: amountMajorUnits,
    currency: currencyCode,
    ...metadata,
  };

  const licenseResult = order.customerEmail
    ? await createLicenseForOrder({
        id: order.sessionId,
        provider: order.provider,
        providerObjectId: order.paymentIntentId ?? order.sessionId,
        userEmail: order.customerEmail,
        tier: licenseConfig.tier ?? undefined,
        entitlements: licenseConfig.entitlements,
        features: licenseConfig.features,
        metadata: licenseMetadata,
        status: order.paymentStatus ?? "completed",
        eventType: "checkout.completed",
        amount: amountMajorUnits,
        currency: currencyCode,
        rawEvent: {
          checkoutSessionId: order.sessionId,
          paymentIntentId: order.paymentIntentId ?? null,
          provider: order.provider,
        },
      }).catch((error: unknown) => {
        logger.error("payments.fulfillment_license_failed", {
          provider: order.provider,
          sessionId: order.sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      })
    : null;

  if (licenseResult?.licenseKey) {
    metadata.licenseKey = licenseResult.licenseKey;
  }
  if (licenseResult?.licenseId) {
    metadata.licenseId = licenseResult.licenseId;
  }

  if (licenseResult?.licenseKey) {
    const now = new Date().toISOString();
    const licenseMetadataUpdate = {
      license: {
        action: licenseResult.action ?? null,
        licenseId: licenseResult.licenseId ?? null,
        licenseKey: licenseResult.licenseKey ?? null,
        updatedAt: now,
      },
    };

    await updateOrderMetadata(
      {
        stripePaymentIntentId: order.paymentIntentId ?? null,
        stripeSessionId: order.sessionId,
      },
      licenseMetadataUpdate,
    );
  }

  if (order.customerEmail && (licenseConfig.entitlements?.length ?? 0) > 0) {
    const serpAuthResult = await upsertSerpAuthEntitlements({
      email: order.customerEmail,
      entitlements: licenseConfig.entitlements,
      context: {
        orderId: order.sessionId,
        paymentIntentId: order.paymentIntentId ?? null,
        provider: order.provider,
        providerAccountAlias: order.providerAccountAlias ?? null,
      },
    });

    if (!serpAuthResult.ok) {
      logger.warn("serp_auth.entitlements_upsert_skipped_or_failed", {
        email: order.customerEmail,
        entitlements: licenseConfig.entitlements,
        status: serpAuthResult.status,
        reason: serpAuthResult.reason,
        orderId: order.sessionId,
        paymentIntentId: order.paymentIntentId ?? null,
        provider: order.provider,
      });
    }
  }

  const ghlOutcome: ProcessFulfilledOrderResult["ghlResult"] = {
    status: "skipped",
    result: null,
  };

  if (!offerConfig?.ghl) {
    logger.debug("ghl.sync_skipped", {
      offerId: order.offerId,
      reason: "missing_configuration",
    });
  } else if (!order.customerEmail) {
    ghlOutcome.status = "error";
    ghlOutcome.error = new Error("missing_customer_email");
    await updateCheckoutSessionStatus(order.sessionId, "completed", {
      paymentProvider: order.provider,
      providerAccountAlias: order.providerAccountAlias ?? null,
      providerSessionId,
      providerPaymentId,
      providerChargeId,
      providerMode,
      metadata: {
        ghlSyncError: "missing_customer_email",
      },
    });
  } else {
    const tagOverrides = order.resolvedGhlTagIds ?? [];
    const ghlConfig =
      tagOverrides.length > 0
        ? {
            ...offerConfig.ghl,
            tagIds: tagOverrides,
          }
        : offerConfig.ghl;

    const urls = order.urls ?? {};
    const amountFormatted =
      order.amountFormatted ?? resolveAmountFormatted(order.amountTotal ?? null, order.currency ?? null);

    try {
      const result = await syncOrderWithGhlWithRetry(ghlConfig, {
        offerId: order.offerId,
        offerName: offerConfig.productName ?? order.productName ?? order.offerId,
        customerEmail: order.customerEmail,
        customerName: order.customerName ?? null,
        customerPhone: order.customerPhone ?? null,
        stripeSessionId: order.sessionId,
        stripePaymentIntentId: order.paymentIntentId ?? null,
        amountTotal: order.amountTotal ?? null,
        amountFormatted,
        currency: order.currency ?? null,
        landerId,
        metadata: serializeMetadataForGhl(metadata),
        productPageUrl: urls.productPageUrl ?? null,
        purchaseUrl: urls.purchaseUrl ?? null,
        storeProductPageUrl: urls.storeProductPageUrl ?? urls.productPageUrl ?? null,
        appsProductPageUrl: urls.appsProductPageUrl ?? urls.productPageUrl ?? null,
        serplyLink: urls.serplyLink ?? null,
        successUrl: urls.successUrl ?? null,
        cancelUrl: urls.cancelUrl ?? null,
        tosAccepted: order.tosAccepted ?? undefined,
        provider: order.provider,
        licenseKey: licenseResult?.licenseKey ?? undefined,
        licenseId: licenseResult?.licenseId ?? undefined,
        licenseAction: licenseResult?.action ?? undefined,
        licenseEntitlements: licenseConfig.entitlements,
        licenseTier: licenseConfig.tier ?? undefined,
        licenseFeatures: licenseConfig.features,
      });

      ghlOutcome.status = result ? "synced" : "skipped";
      ghlOutcome.result = result;

      if (result) {
        const metadataUpdate: Record<string, string> = {
          ghlSyncedAt: new Date().toISOString(),
          ghlSyncError: "",
        };

        if (result.contactId) {
          metadataUpdate.ghlContactId = result.contactId;
        }

        await updateCheckoutSessionStatus(order.sessionId, "completed", {
          paymentProvider: order.provider,
          providerAccountAlias: order.providerAccountAlias ?? null,
          providerSessionId,
          providerPaymentId,
          providerChargeId,
          providerMode,
          metadata: metadataUpdate,
        });
      }
    } catch (error) {
      ghlOutcome.status = "error";
      ghlOutcome.error = error instanceof Error ? error : new Error(String(error));

      const message =
        ghlOutcome.error?.message ??
        (error && typeof error === "object" && "message" in error ? String(error.message) : String(error));

      logger.error("ghl.sync_failed", {
        offerId: order.offerId,
        paymentIntentId: order.paymentIntentId ?? null,
        error: ghlOutcome.error instanceof Error ? { name: ghlOutcome.error.name, message: ghlOutcome.error.message } : ghlOutcome.error,
      });

      await updateCheckoutSessionStatus(order.sessionId, "completed", {
        paymentProvider: order.provider,
        providerAccountAlias: order.providerAccountAlias ?? null,
        providerSessionId,
        providerPaymentId,
        providerChargeId,
        providerMode,
        metadata: {
          ghlSyncError: message,
        },
      });
    }
  }

  return {
    checkoutSessionId,
    licenseResult,
    licenseConfig,
    ghlResult: ghlOutcome,
  };
}
