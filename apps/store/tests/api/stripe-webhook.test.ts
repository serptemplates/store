import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { OfferConfig } from "@/lib/products/offer-config";
import type { CheckoutSessionRecord } from "@/lib/checkout";

vi.hoisted(() => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

vi.mock("node:timers/promises", () => {
  const sleepMock = vi.fn().mockResolvedValue(undefined);
  return {
    setTimeout: sleepMock,
    default: { setTimeout: sleepMock },
  };
});

vi.mock("@/lib/products/offer-config", () => ({
  getOfferConfig: vi.fn(),
}));

vi.mock("@/lib/payments/stripe", () => ({
  getStripeClient: vi.fn(),
}));

vi.mock("@/lib/checkout", () => ({
  findCheckoutSessionByPaymentIntentId: vi.fn(),
  findCheckoutSessionByStripeSessionId: vi.fn(),
  markStaleCheckoutSessions: vi.fn(),
  upsertCheckoutSession: vi.fn(),
  upsertOrder: vi.fn(),
  updateCheckoutSessionStatus: vi.fn(),
}));

vi.mock("@/lib/ghl-client", () => {
  class MockGhlRequestError extends Error {
    status?: number;
    body?: string;
    constructor(message: string, status: number, body?: string) {
      super(message);
      this.name = "GhlRequestError";
      this.status = status;
      this.body = body;
    }
  }

  return {
    syncOrderWithGhl: vi.fn(),
    GhlRequestError: MockGhlRequestError,
    RETRYABLE_STATUS_CODES: new Set([408, 409, 425, 429, 500, 502, 503, 504]),
  };
});

vi.mock("@/lib/webhook-logs", () => ({
  recordWebhookLog: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/notifications/ops", () => ({
  sendOpsAlert: vi.fn(),
}));

import { POST } from "@/app/api/stripe/webhook/route";
import { getStripeClient } from "@/lib/payments/stripe";
import { getOfferConfig } from "@/lib/products/offer-config";
import {
  findCheckoutSessionByPaymentIntentId,
  findCheckoutSessionByStripeSessionId,
  markStaleCheckoutSessions,
  upsertCheckoutSession,
  upsertOrder,
  updateCheckoutSessionStatus,
} from "@/lib/checkout";
import { syncOrderWithGhl, GhlRequestError } from "@/lib/ghl-client";
import { recordWebhookLog } from "@/lib/webhook-logs";
import { sendOpsAlert } from "@/lib/notifications/ops";

const getStripeClientMock = vi.mocked(getStripeClient);
const getOfferConfigMock = vi.mocked(getOfferConfig);
const findCheckoutSessionByPaymentIntentIdMock = vi.mocked(findCheckoutSessionByPaymentIntentId);
const findCheckoutSessionByStripeSessionIdMock = vi.mocked(findCheckoutSessionByStripeSessionId);
const markStaleCheckoutSessionsMock = vi.mocked(markStaleCheckoutSessions);
const upsertCheckoutSessionMock = vi.mocked(upsertCheckoutSession);
const upsertOrderMock = vi.mocked(upsertOrder);
const updateCheckoutSessionStatusMock = vi.mocked(updateCheckoutSessionStatus);
const syncOrderWithGhlMock = vi.mocked(syncOrderWithGhl);
const recordWebhookLogMock = vi.mocked(recordWebhookLog);
const sendOpsAlertMock = vi.mocked(sendOpsAlert);

function buildRequest(rawBody: string, signature = "test-signature") {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: {
      "stripe-signature": signature,
      "content-type": "application/json",
    },
    body: rawBody,
  });
}

const checkoutSessionFixture: CheckoutSessionRecord = {
  id: "checkout-session-id",
  stripeSessionId: "cs_test_123",
  stripePaymentIntentId: null,
  offerId: "demo-offer",
  landerId: "demo-offer",
  customerEmail: "buyer@example.com",
  metadata: {
    productPageUrl: "https://store.example.com/products/demo-offer",
    store_serp_co_product_page_url: "https://store.example.com/products/demo-offer",
    apps_serp_co_product_page_url: "https://apps.example.com/demo-offer",
    purchaseUrl: "https://store.example.com/checkout/demo-offer",
    serply_link: "https://serp.ly/demo-offer",
    success_url: "https://apps.example.com/checkout/success?product=demo-offer",
    cancel_url: "https://apps.example.com/checkout?product=demo-offer",
  },
  status: "pending",
  source: "stripe",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const offerConfigFixture: OfferConfig = {
  id: "demo-offer",
  stripePriceId: "price_123",
  successUrl: "https://example.com/success",
  cancelUrl: "https://example.com/cancel",
  mode: "payment",
  metadata: {
    productPageUrl: "https://store.example.com/products/demo-offer",
    store_serp_co_product_page_url: "https://store.example.com/products/demo-offer",
    apps_serp_co_product_page_url: "https://apps.example.com/demo-offer",
    purchaseUrl: "https://store.example.com/checkout/demo-offer",
    serply_link: "https://serp.ly/demo-offer",
    success_url: "https://apps.example.com/checkout/success?product=demo-offer",
    cancel_url: "https://apps.example.com/checkout?product=demo-offer",
  },
  productName: "Demo Offer",
  ghl: {
    pipelineId: "pipeline_123",
    stageId: "stage_abc",
  },
};

function buildCheckoutSessionEvent() {
  const session = {
    id: "cs_test_123",
    object: "checkout.session",
    amount_total: 9900,
    currency: "usd",
    customer_email: "buyer@example.com",
    customer_details: {
      email: "buyer@example.com",
      name: "Buyer Example",
      phone: "+1234567890",
      address: null,
      tax_exempt: null,
      tax_ids: [],
    },
    payment_intent: "pi_test_123",
    metadata: {
      offerId: "demo-offer",
      landerId: "demo-offer",
      productName: "Demo Offer",
      productPageUrl: "https://store.example.com/products/demo-offer",
      store_serp_co_product_page_url: "https://store.example.com/products/demo-offer",
      apps_serp_co_product_page_url: "https://apps.example.com/demo-offer",
      purchaseUrl: "https://store.example.com/checkout/demo-offer",
      serply_link: "https://serp.ly/demo-offer",
      success_url: "https://apps.example.com/checkout/success?product=demo-offer",
      cancel_url: "https://apps.example.com/checkout?product=demo-offer",
    },
    client_reference_id: null,
    payment_status: "paid",
    status: "complete",
    mode: "payment",
  } satisfies Partial<Stripe.Checkout.Session>;

  return {
    id: "evt_test_123",
    object: "event",
    api_version: "2024-04-10",
    created: Math.floor(Date.now() / 1_000),
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null,
    },
    type: "checkout.session.completed",
    data: {
      object: session,
    },
  } as unknown as Stripe.Event;
}

function buildPaymentIntentEvent(
  type: "payment_intent.succeeded" | "payment_intent.payment_failed",
  overrides: Partial<Stripe.PaymentIntent> = {},
) {
  const baseIntent: Partial<Stripe.PaymentIntent> = {
    id: "pi_test_123",
    object: "payment_intent",
    amount: 9900,
    amount_received: type === "payment_intent.succeeded" ? 9900 : 0,
    currency: "usd",
    status: type === "payment_intent.succeeded" ? "succeeded" : "requires_payment_method",
    payment_method_types: ["card"],
    metadata: {
      offerId: "demo-offer",
      landerId: "demo-offer",
      customerEmail: "buyer@example.com",
      productPageUrl: "https://store.example.com/products/demo-offer",
      store_serp_co_product_page_url: "https://store.example.com/products/demo-offer",
      apps_serp_co_product_page_url: "https://apps.example.com/demo-offer",
      purchaseUrl: "https://store.example.com/checkout/demo-offer",
      serply_link: "https://serp.ly/demo-offer",
      success_url: "https://apps.example.com/checkout/success?product=demo-offer",
      cancel_url: "https://apps.example.com/checkout?product=demo-offer",
    },
    latest_charge: "ch_test_123",
    receipt_email: "buyer@example.com",
  };

  const paymentIntent = { ...baseIntent, ...overrides } as Stripe.PaymentIntent;

  return {
    id: type === "payment_intent.succeeded" ? "evt_pi_succeeded" : "evt_pi_failed",
    object: "event",
    api_version: "2024-04-10",
    created: Math.floor(Date.now() / 1_000),
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null,
    },
    type,
    data: {
      object: paymentIntent,
    },
  } as unknown as Stripe.Event;
}

async function flushMicrotasks() {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markStaleCheckoutSessionsMock.mockResolvedValue(undefined);
    findCheckoutSessionByStripeSessionIdMock.mockResolvedValue(null);
    findCheckoutSessionByPaymentIntentIdMock.mockResolvedValue(null);
    upsertCheckoutSessionMock.mockResolvedValue("checkout-session-id");
    upsertOrderMock.mockResolvedValue(undefined);
    updateCheckoutSessionStatusMock.mockResolvedValue(undefined);
  });

  it("processes checkout.session.completed events and syncs with GHL", async () => {
    const event = buildCheckoutSessionEvent();

    getStripeClientMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    } as unknown as ReturnType<typeof getStripeClient>);

    getOfferConfigMock.mockReturnValue(offerConfigFixture);
    findCheckoutSessionByStripeSessionIdMock.mockResolvedValue(checkoutSessionFixture);

    syncOrderWithGhlMock.mockResolvedValue({
      contactId: "contact_123",
      opportunityCreated: true,
    });

    recordWebhookLogMock.mockResolvedValueOnce(null);
    recordWebhookLogMock.mockResolvedValueOnce({
      status: "success",
      attempts: 1,
    });

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { received: boolean };
    expect(payload.received).toBe(true);

    expect(recordWebhookLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        paymentIntentId: "pi_test_123",
      }),
    );

    expect(upsertOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        offerId: "demo-offer",
        landerId: "demo-offer",
        amountTotal: 9900,
        customerEmail: "buyer@example.com",
        paymentStatus: "paid",
        stripePaymentIntentId: "pi_test_123",
      }),
    );

    expect(syncOrderWithGhlMock).toHaveBeenCalledWith(
      offerConfigFixture.ghl,
      expect.objectContaining({
        offerId: "demo-offer",
        provider: "stripe",
        productPageUrl: "https://store.example.com/products/demo-offer",
        purchaseUrl: "https://store.example.com/checkout/demo-offer",
        licenseEntitlements: ["demo-offer"],
        licenseTier: "demo-offer",
      }),
    );

    expect(updateCheckoutSessionStatusMock).toHaveBeenCalledWith(
      "cs_test_123",
      "completed",
      expect.objectContaining({
        metadata: expect.objectContaining({ ghlSyncedAt: expect.any(String) }),
      }),
    );

    expect(recordWebhookLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        paymentIntentId: "pi_test_123",
      }),
    );

    await flushMicrotasks();
    expect(markStaleCheckoutSessionsMock).toHaveBeenCalled();
  });

  it("sends an ops alert when GHL sync repeatedly fails", async () => {
    const event = buildCheckoutSessionEvent();

    getStripeClientMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    } as unknown as ReturnType<typeof getStripeClient>);

    getOfferConfigMock.mockReturnValue(offerConfigFixture);
    findCheckoutSessionByStripeSessionIdMock.mockResolvedValue(checkoutSessionFixture);

    const error = new GhlRequestError("GHL unavailable", 500, "internal");
    syncOrderWithGhlMock.mockRejectedValue(error);

    recordWebhookLogMock.mockResolvedValueOnce(null);
    recordWebhookLogMock.mockResolvedValueOnce({
      status: "error",
      attempts: 3,
    });

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    expect(updateCheckoutSessionStatusMock).toHaveBeenCalledWith(
      "cs_test_123",
      "completed",
      expect.objectContaining({
        metadata: expect.objectContaining({ ghlSyncError: expect.stringContaining("GHL unavailable") }),
      }),
    );

    expect(sendOpsAlertMock).toHaveBeenCalledWith(
      "GHL sync failed after multiple attempts",
      expect.objectContaining({
        offerId: "demo-offer",
        paymentIntentId: "pi_test_123",
      }),
    );
  });

  it("updates orders when payment_intent.succeeded fires", async () => {
    const event = buildPaymentIntentEvent("payment_intent.succeeded");

    getStripeClientMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    } as unknown as ReturnType<typeof getStripeClient>);

    findCheckoutSessionByPaymentIntentIdMock.mockResolvedValue(checkoutSessionFixture);

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    expect(updateCheckoutSessionStatusMock).toHaveBeenCalledWith(
      checkoutSessionFixture.stripeSessionId,
      "completed",
      expect.objectContaining({
        paymentIntentId: "pi_test_123",
        metadata: expect.objectContaining({ offerId: "demo-offer" }),
      }),
    );

    expect(upsertOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        checkoutSessionId: checkoutSessionFixture.id,
        stripePaymentIntentId: "pi_test_123",
        amountTotal: 9900,
        paymentStatus: "succeeded",
      }),
    );
  });

  it("marks checkout failed when payment_intent.payment_failed fires", async () => {
    const event = buildPaymentIntentEvent("payment_intent.payment_failed", {
      last_payment_error: {
        message: "card declined",
        type: "card_error",
      },
    });

    getStripeClientMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    } as unknown as ReturnType<typeof getStripeClient>);

    findCheckoutSessionByPaymentIntentIdMock.mockResolvedValue(checkoutSessionFixture);

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    expect(updateCheckoutSessionStatusMock).toHaveBeenCalledWith(
      checkoutSessionFixture.stripeSessionId,
      "failed",
      expect.objectContaining({
        paymentIntentId: "pi_test_123",
        metadata: expect.objectContaining({ lastPaymentError: "card declined" }),
      }),
    );

    expect(upsertOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stripePaymentIntentId: "pi_test_123",
        paymentStatus: "requires_payment_method",
      }),
    );
  });
});
