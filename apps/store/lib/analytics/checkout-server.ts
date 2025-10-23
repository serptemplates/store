import { captureServerEvent } from "./posthog-server";

type Primitive = string | number | boolean | null;

type CheckoutCompletedEvent = {
  provider: "stripe";
  amountTotalCents?: number | null;
  currency?: string | null;
  offerId?: string | null;
  landerId?: string | null;
  affiliateId?: string | null;
  checkoutSessionId?: string | null;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  paymentMethod?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  metadata?: Record<string, unknown>;
};

function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, Primitive> {
  if (!metadata) {
    return {};
  }

  const sanitized: Record<string, Primitive> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) {
      continue;
    }

    if (value === null) {
      sanitized[key] = null;
      continue;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      // We only forward array lengths to avoid serialising potentially large nested structures.
      sanitized[`${key}_count`] = value.length;
    }
  }

  return sanitized;
}

export function trackCheckoutCompleted(event: CheckoutCompletedEvent): void {
  const {
    provider,
    amountTotalCents,
    currency,
    offerId,
    landerId,
    affiliateId,
    checkoutSessionId,
    stripeSessionId,
    stripePaymentIntentId,
    paymentMethod,
    customerEmail,
    customerName,
    metadata,
  } = event;

  const amount = typeof amountTotalCents === "number" ? amountTotalCents / 100 : null;
  const distinctId =
    customerEmail ??
    stripeSessionId ??
    checkoutSessionId ??
    `anonymous-${provider}`;

  const sanitizedMetadata = sanitizeMetadata(metadata);
  const resolvedAffiliate = affiliateId ?? (sanitizedMetadata.affiliateId as string | undefined) ?? null;

  captureServerEvent({
    distinctId,
    event: "checkout_completed",
    properties: {
      provider,
      amount_total_cents: amountTotalCents ?? null,
      amount_total: amount,
      currency: currency ? currency.toUpperCase() : null,
      offer_id: offerId ?? null,
      lander_id: landerId ?? null,
      affiliate_id: resolvedAffiliate,
      checkout_session_id: checkoutSessionId ?? null,
      stripe_session_id: stripeSessionId ?? null,
      stripe_payment_intent_id: stripePaymentIntentId ?? null,
      payment_method: paymentMethod ?? null,
      customer_email: customerEmail ?? null,
      customer_name: customerName ?? null,
      ...sanitizedMetadata,
    },
  });
}
