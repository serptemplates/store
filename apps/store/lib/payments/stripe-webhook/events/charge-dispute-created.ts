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
    // We only have the charge ID; cannot derive customer/payment_intent without expansion
    result.chargeId = chargeLike;
    return result;
  }

  // chargeLike is a Stripe.Charge object
  result.chargeId = chargeLike.id ?? null;

  const cust = chargeLike.customer;
  if (typeof cust === "string") {
    result.stripeCustomerId = cust;
  } else if (cust && typeof cust === "object") {
    // DeletedCustomer does not have id, guard accordingly
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

export async function handleChargeDisputeCreated(dispute: Stripe.Dispute) {
  try {
    const { chargeId, stripeCustomerId, paymentIntentId } = extractIdsFromCharge(
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
      const { revokeCustomerFeatures } = await import("@/lib/payments/stripe-entitlements");
      await revokeCustomerFeatures(stripeCustomerId, entitlements);
    } catch (error) {
      logger.debug("stripe.entitlements_revoke_on_dispute_failed", {
        disputeId: dispute.id,
        chargeId,
        paymentIntentId,
        error: error instanceof Error ? { message: error.message, name: error.name } : error,
      });
    }

    if (!customerEmail) {
      return;
    }

    try {
      const { revokeSerpAuthEntitlements } = await import("@/lib/serp-auth/entitlements");
      await revokeSerpAuthEntitlements({
        email: customerEmail,
        entitlements,
        metadata: {
          source: "stripe",
          offerId,
          stripe: {
            eventType: "charge.dispute.created",
            disputeId: dispute.id ?? null,
            chargeId,
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
      logger.debug("serp_auth.entitlements_revoke_on_dispute_failed", {
        disputeId: dispute.id,
        chargeId,
        paymentIntentId,
        error: error instanceof Error ? { message: error.message, name: error.name } : error,
      });
    }
  } catch (error) {
    logger.debug("stripe.charge_dispute_created_handler_failed", {
      disputeId: dispute.id,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }
}
