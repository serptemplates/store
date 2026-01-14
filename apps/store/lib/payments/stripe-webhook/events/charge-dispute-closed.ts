import type Stripe from "stripe";

import { findCheckoutSessionByPaymentIntentId } from "@/lib/checkout";
import logger from "@/lib/logger";
import {
  resolveCheckoutCustomerEmail,
  resolveCheckoutEntitlements,
} from "@/lib/payments/stripe-webhook/helpers/entitlements";

function extractIdsFromCharge(chargeLike: Stripe.Charge | string | null | undefined) {
  const result: {
    chargeId: string | null;
    stripeCustomerId: string | null;
    paymentIntentId: string | null;
  } = { chargeId: null, stripeCustomerId: null, paymentIntentId: null };

  if (!chargeLike) return result;

  if (typeof chargeLike === "string") {
    result.chargeId = chargeLike;
    return result;
  }

  result.chargeId = chargeLike.id ?? null;

  const cust = chargeLike.customer;
  if (typeof cust === "string") {
    result.stripeCustomerId = cust;
  } else if (cust && typeof cust === "object") {
    const maybeId = (cust as Stripe.Customer).id as string | undefined;
    result.stripeCustomerId = maybeId ?? null;
  }

  const pi = chargeLike.payment_intent;
  if (typeof pi === "string") {
    result.paymentIntentId = pi;
  } else if (pi && typeof pi === "object") {
    result.paymentIntentId = (pi as Stripe.PaymentIntent).id ?? null;
  }

  return result;
}

export async function handleChargeDisputeClosed(dispute: Stripe.Dispute) {
  try {
    // Only consider won disputes for re-grant
    if (dispute.status !== "won") {
      return;
    }

    const { stripeCustomerId, paymentIntentId } = extractIdsFromCharge(
      (dispute.charge ?? null) as unknown as Stripe.Charge | string | null,
    );

    if (!stripeCustomerId || !paymentIntentId) {
      return;
    }

    const sessionRecord = await findCheckoutSessionByPaymentIntentId(paymentIntentId);
    const offerId = sessionRecord?.offerId ?? null;
    const entitlements = resolveCheckoutEntitlements(sessionRecord);
    const customerEmail = resolveCheckoutCustomerEmail(sessionRecord);

    if (entitlements.length === 0) {
      return;
    }

    try {
      const { ensureFeaturesExist, grantCustomerFeatures } = await import("@/lib/payments/stripe-entitlements");
      await ensureFeaturesExist(entitlements);
      await grantCustomerFeatures(stripeCustomerId, entitlements);
    } catch (error) {
      logger.debug("stripe.entitlements_regrant_on_dispute_closed_failed", {
        disputeId: dispute.id,
        paymentIntentId,
        error: error instanceof Error ? { message: error.message, name: error.name } : error,
      });
    }

    if (!customerEmail) {
      return;
    }

    try {
      const { grantSerpAuthEntitlements } = await import("@/lib/serp-auth/entitlements");
      await grantSerpAuthEntitlements({
        email: customerEmail,
        entitlements,
        metadata: {
          source: "stripe",
          offerId,
          stripe: {
            eventType: "charge.dispute.closed",
            disputeId: dispute.id ?? null,
            paymentIntentId,
            customerId: stripeCustomerId,
          },
        },
        context: {
          provider: "stripe",
          providerEventId: dispute.id ?? null,
          providerSessionId: sessionRecord?.stripeSessionId ?? null,
        },
      });
    } catch (error) {
      logger.debug("serp_auth.entitlements_regrant_on_dispute_closed_failed", {
        disputeId: dispute.id,
        paymentIntentId,
        error: error instanceof Error ? { message: error.message, name: error.name } : error,
      });
    }
  } catch (error) {
    logger.debug("stripe.charge_dispute_closed_handler_failed", {
      disputeId: dispute.id,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }
}
