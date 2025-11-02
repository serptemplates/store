import type Stripe from "stripe";

import { findCheckoutSessionByPaymentIntentId } from "@/lib/checkout";
import logger from "@/lib/logger";

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
    const entitlements = (() => {
      const raw = (sessionRecord?.metadata as Record<string, unknown> | null | undefined)?.licenseEntitlements;
      if (Array.isArray(raw)) return raw as string[];
      if (typeof raw === "string" && raw.trim().length > 0) return [raw.trim()];
      return offerId ? [offerId] : [];
    })();

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
  } catch (error) {
    logger.debug("stripe.charge_refunded_handler_failed", {
      chargeId: charge.id,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }
}

