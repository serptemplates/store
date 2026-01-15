import type Stripe from "stripe";

import { findCheckoutSessionByPaymentIntentId } from "@/lib/checkout";
import logger from "@/lib/logger";
import { getStripeClient } from "@/lib/payments/stripe";
import {
  resolveCheckoutCustomerEmail,
  resolveCheckoutEntitlements,
} from "@/lib/payments/stripe-webhook/helpers/entitlements";
import type { StripeChargeReference, StripeWebhookContext } from "@/lib/payments/stripe-webhook/types";

function extractIdsFromCharge(chargeLike: StripeChargeReference) {
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

async function resolveDisputeCharge(
  dispute: Stripe.Dispute,
  context?: StripeWebhookContext,
): Promise<StripeChargeReference> {
  const chargeRef = dispute.charge;
  if (!chargeRef || typeof chargeRef !== "string") {
    return chargeRef ?? null;
  }

  try {
    const stripe = getStripeClient({ accountAlias: context?.accountAlias ?? undefined });
    return await stripe.charges.retrieve(chargeRef, {
      expand: ["customer", "payment_intent"],
    });
  } catch (error) {
    logger.warn("stripe.charge_dispute_charge_fetch_failed", {
      disputeId: dispute.id ?? null,
      chargeId: chargeRef,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
    return chargeRef;
  }
}

export async function handleChargeDisputeCreated(
  dispute: Stripe.Dispute,
  context?: StripeWebhookContext,
) {
  try {
    const chargeRef = await resolveDisputeCharge(dispute, context);
    const { chargeId, stripeCustomerId, paymentIntentId } = extractIdsFromCharge(chargeRef);
    const chargeEmail =
      typeof chargeRef === "string" || !chargeRef
        ? null
        : chargeRef.receipt_email ?? chargeRef.billing_details?.email ?? null;

    if (!stripeCustomerId || !paymentIntentId) {
      logger.warn("stripe.charge_dispute_missing_identifiers", {
        disputeId: dispute.id ?? null,
        chargeId,
        stripeCustomerId,
        paymentIntentId,
      });
    }

    const sessionRecord = paymentIntentId
      ? await findCheckoutSessionByPaymentIntentId(paymentIntentId)
      : null;
    if (!sessionRecord && paymentIntentId) {
      logger.warn("stripe.charge_dispute_session_not_found", {
        disputeId: dispute.id ?? null,
        chargeId,
        paymentIntentId,
      });
    }
    const offerId = sessionRecord?.offerId ?? null;
    const entitlements = resolveCheckoutEntitlements(sessionRecord);
    const customerEmail = resolveCheckoutCustomerEmail(sessionRecord) ?? chargeEmail ?? null;

    if (stripeCustomerId && entitlements.length > 0) {
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
    }

    if (!customerEmail) {
      logger.debug("serp_auth.entitlements_revoke_skipped_dispute", {
        disputeId: dispute.id ?? null,
        chargeId,
        paymentIntentId,
      });
      return;
    }

    try {
      const { revokeAllSerpAuthEntitlements } = await import("@/lib/serp-auth/entitlements");
      await revokeAllSerpAuthEntitlements({
        email: customerEmail,
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
