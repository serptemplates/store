import type Stripe from "stripe";

import {
  findCheckoutSessionByStripeSessionId,
  updateCheckoutSessionStatus,
  updateOrderMetadata,
  upsertCheckoutSession,
  upsertOrder,
} from "@/lib/checkout";
import { getOfferConfig } from "@/lib/products/offer-config";
import { createLicenseForOrder } from "@/lib/license-service";
import { GhlRequestError } from "@/lib/ghl-client";
import { recordWebhookLog } from "@/lib/webhook-logs";
import logger from "@/lib/logger";
import { sendOpsAlert } from "@/lib/notifications/ops";
import { normalizeMetadata } from "@/lib/payments/stripe-webhook/metadata";
import { syncOrderWithGhlWithRetry } from "@/lib/payments/stripe-webhook/helpers/ghl-sync";

const OPS_ALERT_THRESHOLD = 3;

function extractLicenseConfig(metadata: Record<string, unknown> | undefined, offerId: string | null) {
  const tierValue = typeof metadata?.licenseTier === "string" ? metadata?.licenseTier : offerId;
  const entitlementsRaw = metadata?.licenseEntitlements;
  const entitlementsSet = new Set<string>();

  if (Array.isArray(entitlementsRaw)) {
    for (const item of entitlementsRaw) {
      if (item != null) {
        entitlementsSet.add(String(item));
      }
    }
  }

  if (offerId) {
    entitlementsSet.add(offerId);
  }

  const entitlements = Array.from(entitlementsSet);

  const featuresRaw = metadata?.licenseFeatures;
  const features = featuresRaw && typeof featuresRaw === "object" && !Array.isArray(featuresRaw)
    ? (featuresRaw as Record<string, unknown>)
    : {};

  return {
    tier: tierValue ?? null,
    entitlements,
    features,
  };
}

export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, eventId?: string) {
  const metadata = normalizeMetadata(session.metadata);

  const tosStatus = session.consent?.terms_of_service ?? null;
  if (tosStatus) {
    metadata.stripeTermsOfService = tosStatus;
    if (tosStatus === "accepted") {
      metadata.tosAccepted = "true";
    }
  }

  const tosRequirement = session.consent_collection?.terms_of_service ?? null;
  if (tosRequirement) {
    metadata.stripeTermsOfServiceRequirement = tosRequirement;
  }

  if (session.client_reference_id) {
    metadata.clientReferenceId = session.client_reference_id;
  }

  const offerId = metadata.offerId
    ?? metadata.productSlug
    ?? session.client_reference_id
    ?? (process.env.NODE_ENV === "development" ? "loom-video-downloader" : null);

  if (!offerId) {
    logger.error("webhook.missing_offer_id", {
      sessionId: session.id,
      metadata,
      clientReferenceId: session.client_reference_id,
    });
    return;
  }

  const landerId = metadata.landerId ?? metadata.productSlug ?? offerId;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
  const customerPhone = session.customer_details?.phone ?? null;
  const offerConfig = getOfferConfig(offerId);

  if (paymentIntentId) {
    await recordWebhookLog({
      paymentIntentId,
      stripeSessionId: session.id,
      eventType: "checkout.session.completed",
      offerId,
      landerId,
      status: "pending",
      metadata,
    });
  }

  const amountFormatted =
    typeof session.amount_total === "number" && session.currency
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: session.currency.toUpperCase(),
        }).format(session.amount_total / 100)
      : null;

  const checkoutSessionId = await upsertCheckoutSession({
    stripeSessionId: session.id,
    offerId,
    landerId,
    paymentIntentId,
    customerEmail,
    metadata,
    status: "completed",
    source: "stripe",
  });

  await upsertOrder({
    checkoutSessionId,
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    offerId,
    landerId,
    customerEmail,
    customerName: session.customer_details?.name ?? null,
    amountTotal: session.amount_total ?? null,
    currency: session.currency ?? null,
    metadata,
    paymentStatus: session.payment_status ?? null,
    paymentMethod: session.payment_method_types?.[0] ?? null,
    source: "stripe",
  });

  let licenseResult: Awaited<ReturnType<typeof createLicenseForOrder>> = null;
  let licenseTier: string | null = null;
  let licenseEntitlements: string[] | null = null;
  let licenseFeatures: Record<string, unknown> | null = null;

  if (customerEmail) {
    const { tier, entitlements, features } = extractLicenseConfig(offerConfig?.metadata, offerId);
    licenseTier = tier ?? null;
    licenseEntitlements = entitlements.length > 0 ? entitlements : null;
    licenseFeatures = Object.keys(features).length > 0 ? features : null;

    const amountMajorUnits =
      typeof session.amount_total === "number" ? Number((session.amount_total / 100).toFixed(2)) : null;
    const currencyCode = typeof session.currency === "string" ? session.currency.toLowerCase() : null;

    const licenseMetadata: Record<string, unknown> = {
      orderId: session.id,
      paymentIntentId,
      stripeSessionId: session.id,
      offerId,
      amount: amountMajorUnits,
      currency: currencyCode,
    };

    if (session.customer_details?.name) {
      licenseMetadata.customerName = session.customer_details.name;
    }

    if (session.client_reference_id) {
      licenseMetadata.clientReferenceId = session.client_reference_id;
    }

    try {
      licenseResult = await createLicenseForOrder({
        id: eventId ?? session.id,
        provider: "stripe",
        providerObjectId: paymentIntentId ?? session.id,
        userEmail: customerEmail,
        tier,
        entitlements,
        features,
        metadata: licenseMetadata,
        status: session.payment_status ?? "completed",
        eventType: "checkout.completed",
        amount: amountMajorUnits,
        currency: currencyCode,
        rawEvent: {
          eventId: eventId ?? null,
          checkoutSessionId: session.id,
          paymentIntentId,
        },
      });

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

        const updated = await updateOrderMetadata(
          {
            stripePaymentIntentId: paymentIntentId,
            stripeSessionId: session.id,
          },
          licenseMetadataUpdate,
        );

        if (!updated) {
          logger.warn("license_service.metadata_update_failed", {
            provider: "stripe",
            id: eventId ?? session.id,
            paymentIntentId,
            sessionId: session.id,
          });
        }
      }
    } catch (error) {
      logger.error("license_service.create_throw", {
        provider: "stripe",
        id: eventId ?? session.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (licenseResult?.licenseKey) {
    metadata.licenseKey = licenseResult.licenseKey;
  }

  if (licenseResult?.licenseId) {
    metadata.licenseId = licenseResult.licenseId;
  }

  const existingSessionRecord = await findCheckoutSessionByStripeSessionId(session.id);
  const existingMetadata = (existingSessionRecord?.metadata ?? {}) as Record<string, unknown>;
  const ghlSyncedAtValue =
    typeof existingMetadata["ghlSyncedAt"] === "string" ? (existingMetadata["ghlSyncedAt"] as string) : undefined;
  const alreadySynced = Boolean(ghlSyncedAtValue);

  if (alreadySynced) {
    logger.debug("ghl.sync_already_completed", {
      offerId,
      stripeSessionId: session.id,
      ghlSyncedAt: existingMetadata.ghlSyncedAt,
    });
    return;
  }

  const productPageUrl =
    offerConfig?.metadata?.productPageUrl
      ?? metadata.productPageUrl
      ?? metadata.product_page_url
      ?? null;

  const storeProductPageUrl =
    offerConfig?.metadata?.store_serp_co_product_page_url
      ?? metadata.store_serp_co_product_page_url
      ?? null;

  const appsProductPageUrl =
    offerConfig?.metadata?.apps_serp_co_product_page_url
      ?? metadata.apps_serp_co_product_page_url
      ?? null;

  const purchaseUrl =
    metadata.purchaseUrl
      ?? metadata.purchase_url
      ?? metadata.serply_link
      ?? metadata.serplyLink
      ?? metadata.checkoutUrl
      ?? metadata.checkout_url
      ?? offerConfig?.metadata?.purchaseUrl
      ?? offerConfig?.metadata?.serply_link
      ?? null;

  const serplyLink =
    metadata.serply_link
      ?? metadata.serplyLink
      ?? purchaseUrl
      ?? offerConfig?.metadata?.serply_link
      ?? null;

  const successUrl =
    metadata.success_url
      ?? metadata.successUrl
      ?? offerConfig?.metadata?.success_url
      ?? offerConfig?.successUrl
      ?? null;

  const cancelUrl =
    metadata.cancel_url
      ?? metadata.cancelUrl
      ?? offerConfig?.metadata?.cancel_url
      ?? offerConfig?.cancelUrl
      ?? null;

  try {
    if (!offerConfig?.ghl) {
      logger.debug("ghl.sync_skipped", {
        offerId,
        reason: "missing_configuration",
      });

      if (paymentIntentId) {
        await recordWebhookLog({
          paymentIntentId,
          stripeSessionId: session.id,
          eventType: "checkout.session.completed",
          offerId,
          landerId,
          status: "success",
          metadata: {
            outcome: "skipped",
            skipReason: "missing_configuration",
          },
        });
      }
      return;
    }

    if (!customerEmail) {
      logger.error("ghl.sync_failed", {
        offerId,
        reason: "missing_customer_email",
        paymentIntentId,
      });

      await updateCheckoutSessionStatus(session.id, "completed", {
        metadata: {
          ghlSyncError: "missing_customer_email",
        },
      });

      if (paymentIntentId) {
        await recordWebhookLog({
          paymentIntentId,
          stripeSessionId: session.id,
          eventType: "checkout.session.completed",
          offerId,
          landerId,
          status: "error",
          message: "Missing customer email; unable to sync to GHL",
          metadata: {
            reason: "missing_customer_email",
          },
        });
      }
      return;
    }

    const syncResult = await syncOrderWithGhlWithRetry(offerConfig?.ghl, {
      offerId,
      offerName: offerConfig?.productName ?? metadata.productName ?? offerId,
      customerEmail,
      customerName: session.customer_details?.name ?? null,
      customerPhone,
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      amountTotal: session.amount_total ?? null,
      amountFormatted,
      currency: session.currency ?? null,
      landerId,
      metadata,
      productPageUrl,
      purchaseUrl,
      storeProductPageUrl: storeProductPageUrl ?? productPageUrl,
      appsProductPageUrl: appsProductPageUrl ?? productPageUrl,
      serplyLink,
      successUrl,
      cancelUrl,
      tosAccepted: metadata.tosAccepted === "true" ? true : metadata.tosAccepted === "false" ? false : undefined,
      provider: "stripe",
      licenseKey: licenseResult?.licenseKey ?? undefined,
      licenseId: licenseResult?.licenseId ?? undefined,
      licenseAction: licenseResult?.action ?? undefined,
      licenseEntitlements: licenseEntitlements ?? undefined,
      licenseTier: licenseTier ?? undefined,
      licenseFeatures: licenseFeatures ?? undefined,
    });

    if (syncResult) {
      const metadataUpdate: Record<string, string> = {
        ghlSyncedAt: new Date().toISOString(),
        ghlSyncError: "",
      };

      if (syncResult.contactId) {
        metadataUpdate.ghlContactId = syncResult.contactId;
      }

      await updateCheckoutSessionStatus(session.id, "completed", {
        metadata: metadataUpdate,
      });
    }

    if (paymentIntentId) {
      const outcomeMetadata: Record<string, unknown> = {
        contactId: syncResult?.contactId,
        opportunityCreated: syncResult?.opportunityCreated ?? false,
        outcome: syncResult ? "synced" : "skipped",
      };

      if (!offerConfig?.ghl) {
        outcomeMetadata.skipReason = "missing_configuration";
      }

      await recordWebhookLog({
        paymentIntentId,
        stripeSessionId: session.id,
        eventType: "checkout.session.completed",
        offerId,
        landerId,
        status: "success",
        metadata: outcomeMetadata,
      });
    }
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error ? String(error.message) : String(error);

    const errorDetails = error instanceof GhlRequestError
      ? { message: error.message, name: error.name, status: error.status, body: error.body }
      : error instanceof Error
      ? { message: error.message, name: error.name }
      : error;

    logger.error("ghl.sync_failed", {
      offerId,
      paymentIntentId,
      error: errorDetails,
    });

    let logResult: Awaited<ReturnType<typeof recordWebhookLog>> = null;
    if (paymentIntentId) {
      logResult = await recordWebhookLog({
        paymentIntentId,
        stripeSessionId: session.id,
        eventType: "checkout.session.completed",
        offerId,
        landerId,
        status: "error",
        message,
        metadata: {
          errorName: error instanceof Error ? error.name : undefined,
        },
      });
    }
    await updateCheckoutSessionStatus(session.id, "completed", {
      metadata: {
        ghlSyncError: message,
      },
    });

    if (logResult?.status === "error" && logResult.attempts >= OPS_ALERT_THRESHOLD) {
      await sendOpsAlert("GHL sync failed after multiple attempts", {
        offerId,
        landerId,
        paymentIntentId,
        attempts: logResult.attempts,
        message,
      });
    }
  }
}
