import type Stripe from "stripe";

import { markStaleCheckoutSessions } from "@/lib/checkout";
import logger from "@/lib/logger";

import { handleCheckoutSessionCompleted } from "./events/checkout-session-completed";
import { handlePaymentIntentSucceeded } from "./events/payment-intent-succeeded";
import { handlePaymentIntentFailed } from "./events/payment-intent-failed";
import { handleUnhandledStripeEvent } from "./events/unhandled-event";

export async function handleStripeEvent(event: Stripe.Event) {
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
      handleUnhandledStripeEvent(event);
  }

  void markStaleCheckoutSessions().catch((error) => {
    logger.error("webhook.mark_stale_failed", {
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  });
}
