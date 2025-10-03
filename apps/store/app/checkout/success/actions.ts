"use server";

import { getStripeClient } from "@/lib/stripe";
import { findCheckoutSessionByStripeSessionId, upsertCheckoutSession, upsertOrder } from "@/lib/checkout-store";
import { createLicenseForOrder } from "@/lib/license-service";
import { updateOrderMetadata } from "@/lib/checkout-store";
import { getOfferConfig } from "@/lib/offer-config";
import { ensureAccountForPurchase } from "@/lib/account-service";
import logger from "@/lib/logger";

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
  const features =
    featuresRaw && typeof featuresRaw === "object" && !Array.isArray(featuresRaw)
      ? (featuresRaw as Record<string, unknown>)
      : {};

  return {
    tier: tierValue ?? null,
    entitlements,
    features,
  };
}

/**
 * Process a checkout session after successful payment.
 * This is a fallback for development environments where webhooks may not be configured.
 * In production, this is redundant with the webhook but provides idempotency.
 */
export async function processCheckoutSession(sessionId: string) {
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

    const metadata = session.metadata ?? {};
    const offerId =
      metadata.offerId ??
      metadata.productSlug ??
      session.client_reference_id ??
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

    const landerId = metadata.landerId ?? metadata.productSlug ?? offerId;
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

    // Ensure account exists and send verification email if needed
    await ensureAccountForPurchase({
      email: customerEmail,
      name: session.customer_details?.name ?? null,
      offerId,
    });

    // Store the order
    const checkoutSessionId = await upsertCheckoutSession({
      stripeSessionId: sessionId,
      offerId,
      landerId,
      paymentIntentId,
      customerEmail,
      metadata: { ...metadata, processedAt: new Date().toISOString() },
      status: "completed",
      source: "stripe",
    });

    await upsertOrder({
      checkoutSessionId,
      stripeSessionId: sessionId,
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

    // Create license if not already processed
    if (!alreadyProcessed) {
      const offerConfig = getOfferConfig(offerId);
      const { tier, entitlements, features } = extractLicenseConfig(offerConfig?.metadata, offerId);

      const amountMajorUnits =
        typeof session.amount_total === "number"
          ? Number((session.amount_total / 100).toFixed(2))
          : null;
      const currencyCode = typeof session.currency === "string" ? session.currency.toLowerCase() : null;

      const licenseMetadata: Record<string, unknown> = {
        orderId: sessionId,
        paymentIntentId,
        stripeSessionId: sessionId,
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
        const licenseResult = await createLicenseForOrder({
          id: sessionId,
          provider: "stripe",
          providerObjectId: paymentIntentId ?? sessionId,
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
            checkoutSessionId: sessionId,
            paymentIntentId,
            source: "success_page_fallback",
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
              stripeSessionId: sessionId,
            },
            licenseMetadataUpdate
          );

          if (!updated) {
            logger.warn("checkout.success.metadata_update_failed", {
              sessionId,
              paymentIntentId,
            });
          }

          logger.info("checkout.success.processed", {
            sessionId,
            offerId,
            hasLicense: true,
          });
        }
      } catch (error) {
        logger.error("checkout.success.license_error", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: true,
      message: "Order processed successfully",
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
