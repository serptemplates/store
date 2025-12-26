import type Stripe from "stripe";

import { markStaleCheckoutSessions } from "@/lib/checkout";
import logger from "@/lib/logger";

import { handleCheckoutSessionCompleted } from "./events/checkout-session-completed";
import { handlePaymentIntentSucceeded } from "./events/payment-intent-succeeded";
import { handlePaymentIntentFailed } from "./events/payment-intent-failed";
import { handleChargeRefunded } from "./events/charge-refunded";
import { handleChargeDisputeCreated } from "./events/charge-dispute-created";
import { handleChargeDisputeClosed } from "./events/charge-dispute-closed";
import { handleUnhandledStripeEvent } from "./events/unhandled-event";

export async function handleStripeEvent(
  event: Stripe.Event,
  options?: { accountAlias?: string | null },
) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
        { id: event.id, type: event.type, created: event.created },
        { accountAlias: options?.accountAlias ?? null },
      );
      break;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;
    case "charge.dispute.created":
      await handleChargeDisputeCreated(event.data.object as Stripe.Dispute);
      break;
    case "charge.dispute.closed":
      await handleChargeDisputeClosed(event.data.object as Stripe.Dispute);
      break;
    default:
      handleUnhandledStripeEvent(event);
  }

  void markStaleCheckoutSessions().catch((error) => {
    logger.error("webhook.mark_stale_failed", {
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  });
}
