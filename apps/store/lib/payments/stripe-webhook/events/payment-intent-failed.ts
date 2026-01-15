import type Stripe from "stripe";

import {
  findCheckoutSessionByPaymentIntentId,
  upsertOrder,
  updateCheckoutSessionStatus,
} from "@/lib/checkout";
import logger from "@/lib/logger";
import { normalizeMetadata } from "@/lib/payments/stripe-webhook/metadata";
import { getMetadataString } from "@/lib/metadata/metadata-access";
import type { StripeWebhookRecordMetadata } from "@/lib/payments/stripe-webhook/types";

export async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  eventType: "payment_intent.payment_failed" | "payment_intent.canceled" = "payment_intent.payment_failed",
) {
  const metadata = normalizeMetadata(paymentIntent.metadata);
  const sessionRecord = await findCheckoutSessionByPaymentIntentId(paymentIntent.id);

  const failureMetadata: StripeWebhookRecordMetadata = { ...metadata };

  if (paymentIntent.last_payment_error?.message) {
    failureMetadata.lastPaymentError = paymentIntent.last_payment_error.message;
  }

  const providerMode = typeof paymentIntent.livemode === "boolean" ? (paymentIntent.livemode ? "live" : "test") : null;
  const stripeChargeId =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id ?? null;
  const offerId = sessionRecord?.offerId ?? getMetadataString(metadata, "offer_id") ?? null;
  const landerId = sessionRecord?.landerId ?? getMetadataString(metadata, "lander_id") ?? null;
  const customerEmail =
    sessionRecord?.customerEmail ??
    paymentIntent.receipt_email ??
    getMetadataString(metadata, "customer_email") ??
    null;

  if (sessionRecord) {
    await updateCheckoutSessionStatus(sessionRecord.stripeSessionId, "failed", {
      paymentIntentId: paymentIntent.id,
      metadata: failureMetadata,
      paymentProvider: sessionRecord.paymentProvider ?? "stripe",
      providerAccountAlias: sessionRecord.providerAccountAlias ?? null,
      providerSessionId: sessionRecord.providerSessionId ?? sessionRecord.stripeSessionId,
      providerPaymentId: paymentIntent.id,
      providerChargeId: stripeChargeId,
      providerMode,
    });
  }

  await upsertOrder({
    checkoutSessionId: sessionRecord?.id ?? null,
    stripeSessionId: sessionRecord?.stripeSessionId ?? null,
    stripePaymentIntentId: paymentIntent.id,
    stripeChargeId,
    paymentProvider: sessionRecord?.paymentProvider ?? "stripe",
    providerAccountAlias: sessionRecord?.providerAccountAlias ?? null,
    providerSessionId: sessionRecord?.providerSessionId ?? sessionRecord?.stripeSessionId ?? null,
    providerPaymentId: paymentIntent.id,
    providerChargeId: stripeChargeId,
    providerMode,
    offerId,
    landerId,
    customerEmail,
    amountTotal: paymentIntent.amount ?? null,
    currency: paymentIntent.currency ?? null,
    metadata: failureMetadata,
    paymentStatus: paymentIntent.status ?? "payment_failed",
    paymentMethod: paymentIntent.payment_method_types?.[0] ?? null,
    source: "stripe",
  });

  if (!customerEmail) {
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
          eventType,
          paymentIntentId: paymentIntent.id ?? null,
          customerId: typeof paymentIntent.customer === "string"
            ? paymentIntent.customer
            : paymentIntent.customer?.id ?? null,
          invoiceId: typeof paymentIntent.invoice === "string"
            ? paymentIntent.invoice
            : paymentIntent.invoice?.id ?? null,
        },
      },
      context: {
        provider: "stripe",
        providerEventId: paymentIntent.id ?? null,
        providerSessionId: sessionRecord?.stripeSessionId ?? null,
      },
    });
  } catch (error) {
    logger.debug("serp_auth.entitlements_revoke_on_payment_intent_failure", {
      paymentIntentId: paymentIntent.id,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
  }
}
