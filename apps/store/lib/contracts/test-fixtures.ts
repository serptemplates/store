import { randomUUID } from "node:crypto";

import type {
  StripeCheckoutSessionCompleted,
  StripePaymentIntent,
  StripeWebhookEvent,
} from "./webhook.contract";
import type { Order } from "./checkout.contract";

const FALLBACK_UUID = "00000000-0000-0000-0000-000000000000";

function buildStripeCustomerDetails() {
  return {
    email: "test@example.com",
    name: "Test User",
    phone: null,
    address: {
      city: null,
      country: "US",
      line1: null,
      line2: null,
      postal_code: null,
      state: null,
    },
  } as StripeCheckoutSessionCompleted["customer_details"];
}

export function buildStripeCheckoutSessionFixture(
  overrides: Partial<StripeCheckoutSessionCompleted> = {},
): StripeCheckoutSessionCompleted {
  return {
    id: "cs_test_fixture",
    object: "checkout.session",
    amount_subtotal: 7900,
    amount_total: 7900,
    currency: "usd",
    customer: "cus_test_fixture",
    customer_details: buildStripeCustomerDetails(),
    customer_email: "test@example.com",
    line_items: undefined,
    metadata: {
      offerId: "demo-product",
      affiliateId: "AFF123",
    },
    mode: "payment",
    payment_intent: "pi_test_fixture",
    payment_status: "paid",
    status: "complete",
    subscription: null,
    success_url: "https://example.com/success",
    cancel_url: "https://example.com/cancel",
    ...overrides,
  };
}

export function buildStripePaymentIntentFixture(
  overrides: Partial<StripePaymentIntent> = {},
): StripePaymentIntent {
  return {
    id: "pi_test_fixture",
    object: "payment_intent",
    amount: 7900,
    amount_capturable: 0,
    amount_received: 7900,
    currency: "usd",
    customer: "cus_test_fixture",
    description: "Demo purchase",
    latest_charge: "ch_test_fixture",
    metadata: {
      offerId: "demo-product",
    },
    receipt_email: "test@example.com",
    status: "succeeded",
    last_payment_error: null,
    ...overrides,
  };
}

export function buildStripeWebhookEventFixture(
  overrides: Partial<StripeWebhookEvent> = {},
  sessionOverrides: Partial<StripeCheckoutSessionCompleted> = {},
): StripeWebhookEvent {
  const session = buildStripeCheckoutSessionFixture(sessionOverrides);

  return {
    id: "evt_test_fixture",
    object: "event",
    api_version: "2023-10-16",
    created: Math.floor(Date.now() / 1000),
    type: "checkout.session.completed",
    data: {
      object: session,
      previous_attributes: undefined,
    },
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: null,
      idempotency_key: null,
    },
    ...overrides,
  };
}

export function buildOrderFixture(overrides: Partial<Order> = {}): Order {
  const baseId = overrides.id ?? randomUUID();
  return {
    id: baseId,
    checkoutSessionId: overrides.checkoutSessionId ?? FALLBACK_UUID,
    stripeSessionId: overrides.stripeSessionId ?? "cs_test_fixture",
    stripePaymentIntentId: overrides.stripePaymentIntentId ?? "pi_test_fixture",
    stripeChargeId: overrides.stripeChargeId ?? "ch_test_fixture",
    offerId: overrides.offerId ?? "demo-product",
    landerId: overrides.landerId ?? "demo-product",
    customerEmail: overrides.customerEmail ?? "test@example.com",
    customerName: overrides.customerName ?? "Test User",
    amountTotal: overrides.amountTotal ?? 7900,
    currency: overrides.currency ?? "usd",
    metadata: overrides.metadata ?? {},
    paymentStatus: overrides.paymentStatus ?? "succeeded",
    paymentMethod: overrides.paymentMethod ?? "card",
    source: overrides.source ?? "stripe",
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}
