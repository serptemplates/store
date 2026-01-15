import type Stripe from "stripe";

import { markStaleCheckoutSessions } from "@/lib/checkout";
import logger from "@/lib/logger";

import { handleCheckoutSessionCompleted } from "./events/checkout-session-completed";
import { handlePaymentIntentSucceeded } from "./events/payment-intent-succeeded";
import { handlePaymentIntentFailed } from "./events/payment-intent-failed";
import { handleChargeRefunded } from "./events/charge-refunded";
import { handleChargeDisputeCreated } from "./events/charge-dispute-created";
import { handleChargeDisputeClosed } from "./events/charge-dispute-closed";
import { handleCustomerSubscriptionDeleted } from "./events/customer-subscription-deleted";
import { handleInvoicePaymentFailed } from "./events/invoice-payment-failed";
import { handleInvoicePaymentSucceeded } from "./events/invoice-payment-succeeded";
import { handleUnhandledStripeEvent } from "./events/unhandled-event";
import type { StripeWebhookContext } from "./types";

export async function handleStripeEvent(
  event: Stripe.Event,
  options?: StripeWebhookContext,
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
    case "payment_intent.canceled":
      await handlePaymentIntentFailed(
        event.data.object as Stripe.PaymentIntent,
        "payment_intent.canceled",
      );
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;
    case "charge.dispute.created":
      await handleChargeDisputeCreated(event.data.object as Stripe.Dispute, {
        accountAlias: options?.accountAlias ?? null,
      });
      break;
    case "charge.dispute.closed":
      await handleChargeDisputeClosed(event.data.object as Stripe.Dispute, {
        accountAlias: options?.accountAlias ?? null,
      });
      break;
    case "customer.subscription.deleted":
      await handleCustomerSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, {
        accountAlias: options?.accountAlias ?? null,
      });
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
