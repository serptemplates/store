import type Stripe from "stripe";

import { findCheckoutSessionBySubscriptionId } from "@/lib/checkout";
import logger from "@/lib/logger";
import { resolveCheckoutCustomerEmail } from "@/lib/payments/stripe-webhook/helpers/entitlements";

function hasRemainingSubscriptionTime(subscription: Stripe.Subscription): boolean {
  const currentPeriodEnd = subscription.current_period_end;
  if (typeof currentPeriodEnd !== "number") {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1_000);
  return currentPeriodEnd > nowSeconds;
}

export async function handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const subscriptionId = subscription.id ?? null;

    if (!subscriptionId) {
      return;
    }

    const sessionRecord = await findCheckoutSessionBySubscriptionId(subscriptionId);
    if (!sessionRecord) {
      logger.debug("stripe.subscription_deleted_missing_session", { subscriptionId });
      return;
    }

    const offerId = sessionRecord.offerId ?? null;
    const customerEmail = resolveCheckoutCustomerEmail(sessionRecord);

    if (!customerEmail) {
      logger.debug("serp_auth.entitlements_revoke_skipped_subscription", {
        subscriptionId,
        hasEmail: false,
      });
      return;
    }

    if (hasRemainingSubscriptionTime(subscription)) {
      logger.info("stripe.subscription_deleted_skipped_remaining_period", {
        subscriptionId,
        currentPeriodEnd: subscription.current_period_end ?? null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? null,
        canceledAt: subscription.canceled_at ?? null,
        status: subscription.status ?? null,
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
            eventType: "customer.subscription.deleted",
            subscriptionId,
            customerId: typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer?.id ?? null,
          },
        },
        context: {
          provider: "stripe",
          providerEventId: subscriptionId,
          providerSessionId: sessionRecord.stripeSessionId ?? null,
        },
      });
    } catch (error) {
      logger.debug("serp_auth.entitlements_revoke_on_subscription_deleted_failed", {
        subscriptionId,
        error: error instanceof Error ? { message: error.message, name: error.name } : error,
      });
    }
  } catch (error) {
    logger.debug("stripe.customer_subscription_deleted_handler_failed", {
      subscriptionId: subscription?.id ?? null,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }
}
