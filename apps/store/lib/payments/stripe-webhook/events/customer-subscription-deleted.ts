import type Stripe from "stripe";

import { findCheckoutSessionBySubscriptionId } from "@/lib/checkout";
import logger from "@/lib/logger";
import {
  resolveCheckoutCustomerEmail,
  resolveCheckoutEntitlements,
} from "@/lib/payments/stripe-webhook/helpers/entitlements";

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
    const entitlements = resolveCheckoutEntitlements(sessionRecord);
    const customerEmail = resolveCheckoutCustomerEmail(sessionRecord);

    if (entitlements.length === 0 || !customerEmail) {
      logger.debug("serp_auth.entitlements_revoke_skipped_subscription", {
        subscriptionId,
        hasEmail: Boolean(customerEmail),
        entitlementsCount: entitlements.length,
      });
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
