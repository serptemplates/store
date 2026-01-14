import type Stripe from "stripe";

import { findCheckoutSessionBySubscriptionId } from "@/lib/checkout";
import logger from "@/lib/logger";
import { getStripeClient } from "@/lib/payments/stripe";
import {
  resolveCheckoutCustomerEmail,
  resolveCheckoutEntitlements,
} from "@/lib/payments/stripe-webhook/helpers/entitlements";
import { getOfferConfig } from "@/lib/products/offer-config";
import type { StripeWebhookContext } from "@/lib/payments/stripe-webhook/types";

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveProductName(
  sessionRecord: Awaited<ReturnType<typeof findCheckoutSessionBySubscriptionId>>,
): string | null {
  if (!sessionRecord) {
    return null;
  }

  const metadata = sessionRecord.metadata ?? {};
  const fromMetadata =
    asTrimmedString(metadata["product_name"]) ??
    asTrimmedString(metadata["productName"]);
  if (fromMetadata) {
    return fromMetadata;
  }

  const offerConfig = getOfferConfig(sessionRecord.offerId);
  return asTrimmedString(offerConfig?.productName);
}

export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  context?: StripeWebhookContext,
) {
  try {
    const subscriptionId = typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id ?? null;

    if (!subscriptionId) {
      return;
    }

    const sessionRecord = await findCheckoutSessionBySubscriptionId(subscriptionId);
    if (!sessionRecord) {
      logger.debug("stripe.invoice_succeeded_missing_session", {
        invoiceId: invoice.id ?? null,
        subscriptionId,
      });
      return;
    }

    const offerId = sessionRecord.offerId ?? null;
    const entitlements = resolveCheckoutEntitlements(sessionRecord);
    const customerEmail = resolveCheckoutCustomerEmail(sessionRecord)
      ?? invoice.customer_email
      ?? null;

    const paymentIntentId =
      typeof invoice.payment_intent === "string"
        ? invoice.payment_intent
        : invoice.payment_intent?.id ?? null;
    const productName = resolveProductName(sessionRecord) ?? sessionRecord.offerId;

    if (paymentIntentId && productName) {
      try {
        const stripe = getStripeClient({ accountAlias: context?.accountAlias ?? undefined });
        const description = `Subscription - ${productName}`;
        await stripe.paymentIntents.update(paymentIntentId, { description });
        logger.info("stripe.payment_intent_description_updated", {
          paymentIntentId,
          description,
          source: "invoice.payment_succeeded",
        });
      } catch (error) {
        logger.warn("stripe.payment_intent_description_update_failed", {
          paymentIntentId,
          error: error instanceof Error ? { message: error.message, name: error.name } : error,
          source: "invoice.payment_succeeded",
        });
      }
    }

    if (entitlements.length === 0 || !customerEmail) {
      logger.debug("serp_auth.entitlements_regrant_skipped_invoice_succeeded", {
        invoiceId: invoice.id ?? null,
        subscriptionId,
        hasEmail: Boolean(customerEmail),
        entitlementsCount: entitlements.length,
      });
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
            eventType: "invoice.payment_succeeded",
            invoiceId: invoice.id ?? null,
            subscriptionId,
            customerId: typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id ?? null,
            paymentIntentId: typeof invoice.payment_intent === "string"
              ? invoice.payment_intent
              : invoice.payment_intent?.id ?? null,
          },
        },
        context: {
          provider: "stripe",
          providerEventId: invoice.id ?? null,
          providerSessionId: sessionRecord.stripeSessionId ?? null,
        },
      });
    } catch (error) {
      logger.debug("serp_auth.entitlements_regrant_on_invoice_succeeded_failed", {
        invoiceId: invoice.id ?? null,
        subscriptionId,
        error: error instanceof Error ? { message: error.message, name: error.name } : error,
      });
    }
  } catch (error) {
    logger.debug("stripe.invoice_payment_succeeded_handler_failed", {
      invoiceId: invoice?.id ?? null,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }
}
