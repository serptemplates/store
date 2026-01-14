import type Stripe from "stripe";

import { findCheckoutSessionBySubscriptionId } from "@/lib/checkout";
import logger from "@/lib/logger";
import {
  resolveCheckoutCustomerEmail,
  resolveCheckoutEntitlements,
} from "@/lib/payments/stripe-webhook/helpers/entitlements";

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const subscriptionId = typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id ?? null;

    if (!subscriptionId) {
      return;
    }

    const sessionRecord = await findCheckoutSessionBySubscriptionId(subscriptionId);
    if (!sessionRecord) {
      logger.debug("stripe.invoice_failed_missing_session", {
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

    if (entitlements.length === 0 || !customerEmail) {
      logger.debug("serp_auth.entitlements_revoke_skipped_invoice_failed", {
        invoiceId: invoice.id ?? null,
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
            eventType: "invoice.payment_failed",
            invoiceId: invoice.id ?? null,
            subscriptionId,
            customerId: typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id ?? null,
          },
        },
        context: {
          provider: "stripe",
          providerEventId: invoice.id ?? null,
          providerSessionId: sessionRecord.stripeSessionId ?? null,
        },
      });
    } catch (error) {
      logger.debug("serp_auth.entitlements_revoke_on_invoice_failed", {
        invoiceId: invoice.id ?? null,
        subscriptionId,
        error: error instanceof Error ? { message: error.message, name: error.name } : error,
      });
    }
  } catch (error) {
    logger.debug("stripe.invoice_payment_failed_handler_failed", {
      invoiceId: invoice?.id ?? null,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }
}
