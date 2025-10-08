import { setTimeout as sleep } from "node:timers/promises";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type Stripe from "stripe";

import {
  findCheckoutSessionByPaymentIntentId,
  findCheckoutSessionByStripeSessionId,
  markStaleCheckoutSessions,
  upsertCheckoutSession,
  upsertOrder,
  updateCheckoutSessionStatus,
  updateOrderMetadata,
} from "@/lib/checkout-store";
import { getOfferConfig } from "@/lib/offer-config";
import { syncOrderWithGhl, GhlRequestError, RETRYABLE_STATUS_CODES } from "@/lib/ghl-client";
import { getStripeClient } from "@/lib/stripe";
import { getOptionalStripeWebhookSecret } from "@/lib/stripe-environment";
import { recordWebhookLog } from "@/lib/webhook-logs";
import logger from "@/lib/logger";
import { sendOpsAlert } from "@/lib/ops-notify";
import { createLicenseForOrder } from "@/lib/license-service";

const webhookSecret = getOptionalStripeWebhookSecret();

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function normalizeMetadata(metadata: Stripe.Metadata | null | undefined): Record<string, string> {
  if (!metadata) {
    return {};
  }

  return Object.entries(metadata).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value;
    }
    return acc;
  }, {});
}

const MAX_GHL_SYNC_ATTEMPTS = 3;
const GHL_SYNC_RETRY_DELAY_MS = 500;
const OPS_ALERT_THRESHOLD = 3;

async function syncOrderWithGhlWithRetry(
  config: Parameters<typeof syncOrderWithGhl>[0],
  context: Parameters<typeof syncOrderWithGhl>[1],
) {
  for (let attempt = 1; attempt <= MAX_GHL_SYNC_ATTEMPTS; attempt += 1) {
    try {
      return await syncOrderWithGhl(config, context);
    } catch (error) {
      const isRetryableError =
        error instanceof GhlRequestError && RETRYABLE_STATUS_CODES.has(error.status ?? 0);

      if (!isRetryableError || attempt === MAX_GHL_SYNC_ATTEMPTS) {
        throw error;
      }

      const delay = GHL_SYNC_RETRY_DELAY_MS * 2 ** (attempt - 1);
      logger.warn("ghl.sync_retry", {
        attempt,
        maxAttempts: MAX_GHL_SYNC_ATTEMPTS,
        delayMs: delay,
        offerId: context.offerId,
        paymentIntentId: context.stripePaymentIntentId ?? null,
        status: (error as GhlRequestError).status,
      });

      await sleep(delay);
    }
  }

  return null;
}

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

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, eventId?: string) {
  const metadata = normalizeMetadata(session.metadata);

  if (session.client_reference_id) {
    metadata.clientReferenceId = session.client_reference_id;
  }

  // Try to get offerId from multiple sources
  const offerId = metadata.offerId
    ?? metadata.productSlug
    ?? session.client_reference_id
    ?? (process.env.NODE_ENV === 'development' ? 'demo-ecommerce-product' : null);

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
          licenseMetadataUpdate
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

  const purchaseUrl =
    metadata.purchaseUrl
      ?? metadata.purchase_url
      ?? metadata.checkoutUrl
      ?? metadata.checkout_url
      ?? offerConfig?.metadata?.purchaseUrl
      ?? null;

  try {
    if (!customerEmail) {
      logger.warn("ghl.skip_missing_email", {
        offerId,
        paymentIntentId,
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

    // Log the full error details including GHL response body
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

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const metadata = normalizeMetadata(paymentIntent.metadata);

  const sessionRecord = await findCheckoutSessionByPaymentIntentId(paymentIntent.id);

  const checkoutSessionId = sessionRecord?.id ?? null;
  const stripeSessionId = sessionRecord?.stripeSessionId ?? null;
  const offerId = sessionRecord?.offerId ?? metadata.offerId ?? null;
  const landerId = sessionRecord?.landerId ?? metadata.landerId ?? null;

  const customerEmail =
    sessionRecord?.customerEmail ??
    paymentIntent.receipt_email ??
    metadata.customerEmail ??
    null;

  if (sessionRecord) {
    await updateCheckoutSessionStatus(sessionRecord.stripeSessionId, "completed", {
      paymentIntentId: paymentIntent.id,
      customerEmail,
      metadata,
    });
  }

  const customerName = metadata.customerName ?? null;
  const paymentMethod = paymentIntent.payment_method_types?.[0] ?? null;

  const stripeChargeId =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id ?? null;

  await upsertOrder({
    checkoutSessionId,
    stripeSessionId,
    stripePaymentIntentId: paymentIntent.id,
    stripeChargeId,
    offerId,
    landerId,
    customerEmail,
    customerName,
    amountTotal: paymentIntent.amount_received ?? paymentIntent.amount ?? null,
    currency: paymentIntent.currency ?? null,
    metadata,
    paymentStatus: paymentIntent.status ?? null,
    paymentMethod,
    source: "stripe",
  });
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const metadata = normalizeMetadata(paymentIntent.metadata);
  const sessionRecord = await findCheckoutSessionByPaymentIntentId(paymentIntent.id);

  const failureMetadata: Record<string, unknown> = { ...metadata };

  if (paymentIntent.last_payment_error?.message) {
    failureMetadata.lastPaymentError = paymentIntent.last_payment_error.message;
  }

  if (sessionRecord) {
    await updateCheckoutSessionStatus(sessionRecord.stripeSessionId, "failed", {
      paymentIntentId: paymentIntent.id,
      metadata: failureMetadata,
    });
  }

  const stripeChargeId =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id ?? null;

  await upsertOrder({
    checkoutSessionId: sessionRecord?.id ?? null,
    stripeSessionId: sessionRecord?.stripeSessionId ?? null,
    stripePaymentIntentId: paymentIntent.id,
    stripeChargeId,
    offerId: sessionRecord?.offerId ?? metadata.offerId ?? null,
    landerId: sessionRecord?.landerId ?? metadata.landerId ?? null,
    customerEmail:
      sessionRecord?.customerEmail ?? paymentIntent.receipt_email ?? metadata.customerEmail ?? null,
    amountTotal: paymentIntent.amount ?? null,
    currency: paymentIntent.currency ?? null,
    metadata: failureMetadata,
    paymentStatus: paymentIntent.status ?? "payment_failed",
    paymentMethod: paymentIntent.payment_method_types?.[0] ?? null,
    source: "stripe",
  });
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, event.id);
      break;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    default:
      logger.debug("webhook.unhandled_event", { eventType: event.type });
  }

  void markStaleCheckoutSessions().catch((error) => {
    logger.error("webhook.mark_stale_failed", {
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();

  if (!webhookSecret) {
    return jsonResponse({ error: "Stripe webhook secret not configured" }, 500);
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return jsonResponse({ error: "Missing Stripe signature header" }, 400);
  }

  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Unable to construct Stripe event";
    return jsonResponse({ error: message }, 400);
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    logger.error("webhook.event_processing_failed", {
      eventId: event.id,
      type: event.type,
      error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
    });
    return jsonResponse({ error: "Failed to process event" }, 500);
  }

  return jsonResponse({ received: true });
}

export const runtime = "nodejs";
