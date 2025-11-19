import type Stripe from "stripe";

import {
  findCheckoutSessionByPaymentIntentId,
  updateCheckoutSessionStatus,
  upsertOrder,
} from "@/lib/checkout";
import { trackCheckoutCompleted } from "@/lib/analytics/checkout-server";
import { normalizeMetadata } from "@/lib/payments/stripe-webhook/metadata";

export async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const metadata = normalizeMetadata(paymentIntent.metadata);

  const sessionRecord = await findCheckoutSessionByPaymentIntentId(paymentIntent.id);

  const checkoutSessionId = sessionRecord?.id ?? null;
  const stripeSessionId = sessionRecord?.stripeSessionId ?? null;
  const offerId = sessionRecord?.offerId ?? metadata.offerId ?? null;
  const landerId = sessionRecord?.landerId ?? metadata.landerId ?? null;
  const sessionMetadata = sessionRecord?.metadata ?? {};

  const customerEmail =
    sessionRecord?.customerEmail ??
    paymentIntent.receipt_email ??
    metadata.customerEmail ??
    null;

  const amountTotalCents = paymentIntent.amount_received ?? paymentIntent.amount ?? null;
  const providerMode = typeof paymentIntent.livemode === "boolean" ? (paymentIntent.livemode ? "live" : "test") : null;
  const stripeChargeId =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id ?? null;

  if (sessionRecord) {
    await updateCheckoutSessionStatus(sessionRecord.stripeSessionId, "completed", {
      paymentIntentId: paymentIntent.id,
      customerEmail,
      metadata,
      paymentProvider: sessionRecord.paymentProvider ?? "stripe",
      providerAccountAlias: sessionRecord.providerAccountAlias ?? null,
      providerSessionId: sessionRecord.providerSessionId ?? sessionRecord.stripeSessionId,
      providerPaymentId: paymentIntent.id,
      providerChargeId: stripeChargeId,
      providerMode,
    });
  }

  const customerName = metadata.customerName ?? null;
  const paymentMethod = paymentIntent.payment_method_types?.[0] ?? null;

  await upsertOrder({
    checkoutSessionId,
    stripeSessionId,
    stripePaymentIntentId: paymentIntent.id,
    stripeChargeId,
    paymentProvider: sessionRecord?.paymentProvider ?? "stripe",
    providerAccountAlias: sessionRecord?.providerAccountAlias ?? null,
    providerSessionId: sessionRecord?.providerSessionId ?? stripeSessionId,
    providerPaymentId: paymentIntent.id,
    providerChargeId: stripeChargeId,
    providerMode,
    offerId,
    landerId,
    customerEmail,
    customerName,
    amountTotal: paymentIntent.amount_received ?? paymentIntent.amount ?? null,
    currency: paymentIntent.currency ?? null,
    metadata,
    paymentStatus: paymentIntent.status ?? null,
    paymentMethod,
    source: "stripe",
  });

  const sessionAffiliate = (sessionMetadata as Record<string, unknown>).affiliateId;
  const affiliateId =
    (typeof metadata.affiliateId === "string" ? metadata.affiliateId : undefined) ??
    (typeof sessionAffiliate === "string" ? sessionAffiliate : undefined) ??
    null;

  const combinedMetadata: Record<string, unknown> = {
    ...(sessionMetadata as Record<string, unknown>),
    ...metadata,
  };

  trackCheckoutCompleted({
    provider: "stripe",
    amountTotalCents,
    currency: paymentIntent.currency ?? null,
    offerId,
    landerId,
    affiliateId,
    checkoutSessionId,
    stripeSessionId,
    stripePaymentIntentId: paymentIntent.id,
    paymentMethod,
    customerEmail,
    customerName,
    metadata: combinedMetadata,
  });
}
