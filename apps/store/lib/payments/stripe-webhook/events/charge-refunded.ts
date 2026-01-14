import type Stripe from "stripe";

import { findCheckoutSessionByPaymentIntentId } from "@/lib/checkout";
import logger from "@/lib/logger";
import {
  resolveCheckoutCustomerEmail,
  resolveCheckoutEntitlements,
} from "@/lib/payments/stripe-webhook/helpers/entitlements";

export async function handleChargeRefunded(charge: Stripe.Charge) {
  try {
    const stripeCustomerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id ?? null;
    const paymentIntentId = typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

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
      logger.debug("stripe.entitlements_revoke_skipped_or_failed", {
        chargeId: charge.id,
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
            eventType: "charge.refunded",
            chargeId: charge.id ?? null,
            paymentIntentId,
            customerId: stripeCustomerId,
          },
        },
        context: {
          provider: "stripe",
          providerEventId: charge.id ?? null,
          providerSessionId: sessionRecord?.stripeSessionId ?? null,
        },
      });
    } catch (error) {
      logger.debug("serp_auth.entitlements_revoke_on_refund_failed", {
        chargeId: charge.id,
        paymentIntentId,
        error: error instanceof Error ? { message: error.message, name: error.name } : error,
      });
    }
  } catch (error) {
    logger.debug("stripe.charge_refunded_handler_failed", {
      chargeId: charge.id,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }
}
