import type Stripe from "stripe";

import {
  findCheckoutSessionByPaymentIntentId,
  upsertOrder,
  updateCheckoutSessionStatus,
} from "@/lib/checkout";
import { normalizeMetadata } from "@/lib/payments/stripe-webhook/metadata";

export async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const metadata = normalizeMetadata(paymentIntent.metadata);
  const sessionRecord = await findCheckoutSessionByPaymentIntentId(paymentIntent.id);

  const failureMetadata: Record<string, unknown> = { ...metadata };

  if (paymentIntent.last_payment_error?.message) {
    failureMetadata.lastPaymentError = paymentIntent.last_payment_error.message;
  }

  const providerMode = typeof paymentIntent.livemode === "boolean" ? (paymentIntent.livemode ? "live" : "test") : null;
  const stripeChargeId =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id ?? null;

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
    offerId: sessionRecord?.offerId ?? metadata.offerId ?? null,
    landerId: sessionRecord?.landerId ?? metadata.landerId ?? null,
    customerEmail:
      sessionRecord?.customerEmail ??
      paymentIntent.receipt_email ??
      metadata.customerEmail ??
      null,
    amountTotal: paymentIntent.amount ?? null,
    currency: paymentIntent.currency ?? null,
    metadata: failureMetadata,
    paymentStatus: paymentIntent.status ?? "payment_failed",
    paymentMethod: paymentIntent.payment_method_types?.[0] ?? null,
    source: "stripe",
  });
}
