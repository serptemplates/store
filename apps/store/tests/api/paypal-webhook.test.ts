import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OfferConfig } from "@/lib/offer-config";
import type { CheckoutSessionRecord } from "@/lib/checkout-store";

process.env.PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID ?? "webhook_test";

vi.mock("@/lib/paypal", () => ({
  verifyPayPalWebhook: vi.fn(),
  getPayPalOrder: vi.fn(),
}));

vi.mock("@/lib/checkout-store", () => ({
  findCheckoutSessionByStripeSessionId: vi.fn(),
  updateCheckoutSessionStatus: vi.fn(),
  upsertOrder: vi.fn(),
}));

vi.mock("@/lib/ghl-client", () => ({
  syncOrderWithGhl: vi.fn(),
}));

vi.mock("@/lib/offer-config", () => ({
  getOfferConfig: vi.fn(),
}));

vi.mock("@/lib/webhook-logs", () => ({
  recordWebhookLog: vi.fn(),
}));

import { verifyPayPalWebhook, getPayPalOrder } from "@/lib/paypal";
import {
  findCheckoutSessionByStripeSessionId,
  updateCheckoutSessionStatus,
  upsertOrder,
} from "@/lib/checkout-store";
import { syncOrderWithGhl } from "@/lib/ghl-client";
import { getOfferConfig } from "@/lib/offer-config";
import { recordWebhookLog } from "@/lib/webhook-logs";

const verifyPayPalWebhookMock = vi.mocked(verifyPayPalWebhook);
const getPayPalOrderMock = vi.mocked(getPayPalOrder);
const findCheckoutSessionByStripeSessionIdMock = vi.mocked(findCheckoutSessionByStripeSessionId);
const updateCheckoutSessionStatusMock = vi.mocked(updateCheckoutSessionStatus);
const upsertOrderMock = vi.mocked(upsertOrder);
const syncOrderWithGhlMock = vi.mocked(syncOrderWithGhl);
const getOfferConfigMock = vi.mocked(getOfferConfig);
const recordWebhookLogMock = vi.mocked(recordWebhookLog);

function buildRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/paypal/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function postWebhook(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  const { POST } = await import("@/app/api/paypal/webhook/route");
  return POST(buildRequest(body, headers));
}

const baseOrder = {
  id: "order_123",
  status: "COMPLETED",
  payer: {
    email_address: "buyer@example.com",
    name: { given_name: "Buyer", surname: "Example" },
  },
  purchase_units: [
    {
      payments: {
        captures: [
          {
            id: "capture_123",
            amount: { value: "99.00", currency_code: "USD" },
          },
        ],
      },
    },
  ],
};

describe("POST /api/paypal/webhook", () => {
  const checkoutSessionFixture: CheckoutSessionRecord = {
    id: "checkout-id",
    stripeSessionId: "paypal_order_123",
    stripePaymentIntentId: null,
    offerId: "demo-offer",
    landerId: "demo-offer",
    customerEmail: "buyer@example.com",
    metadata: {},
    status: "pending",
    source: "paypal",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const offerConfigFixture: OfferConfig = {
    id: "demo-offer",
    stripePriceId: "price_123",
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    mode: "payment",
    metadata: {},
    productName: "Demo Offer",
    ghl: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    verifyPayPalWebhookMock.mockResolvedValue(true);
    getPayPalOrderMock.mockResolvedValue(baseOrder as any);
    findCheckoutSessionByStripeSessionIdMock.mockResolvedValue(checkoutSessionFixture);
    getOfferConfigMock.mockReturnValue(offerConfigFixture);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("processes completed events and records success", async () => {
    const event = {
      id: "evt_1",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "capture_123",
        supplementary_data: {
          related_ids: { order_id: "order_123" },
        },
      },
    };

    const response = await postWebhook(event);
    expect(response.status).toBe(200);

    expect(updateCheckoutSessionStatusMock).toHaveBeenCalledWith("checkout-id", "completed");

    const orderCall = upsertOrderMock.mock.calls[0][0] as Record<string, unknown>;
    expect(orderCall).toMatchObject({
      stripeSessionId: "paypal_order_123",
      customer_email: "buyer@example.com",
      payment_method: "paypal",
      payment_status: "completed",
      source: "paypal",
    });

    expect(recordWebhookLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        eventType: "PAYMENT.CAPTURE.COMPLETED",
      }),
    );

    expect(syncOrderWithGhlMock).toHaveBeenCalledWith(
      offerConfigFixture.ghl,
      expect.objectContaining({ offerId: "demo-offer" }),
    );
  });

  it("rejects invalid signatures in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    verifyPayPalWebhookMock.mockRejectedValue(new Error("bad signature"));

    const response = await postWebhook({
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "capture_bad",
        supplementary_data: { related_ids: { order_id: "order_123" } },
      },
    });
    expect(response.status).toBe(401);
  });

  it("marks sessions failed on denied events", async () => {
    const event = {
      id: "evt_denied",
      event_type: "PAYMENT.CAPTURE.DENIED",
      resource: {
        id: "capture_999",
        supplementary_data: {
          related_ids: { order_id: "order_123" },
        },
      },
    };

    const response = await postWebhook(event);
    expect(response.status).toBe(200);

    expect(updateCheckoutSessionStatusMock).toHaveBeenCalledWith("checkout-id", "failed");
  });
});
