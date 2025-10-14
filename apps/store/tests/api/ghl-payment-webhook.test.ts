import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/webhook-logs", () => ({
  recordWebhookLog: vi.fn(),
}));

vi.mock("@/lib/account/service", () => ({
  ensureAccountForPurchase: vi.fn(),
}));

vi.mock("@/lib/checkout", () => ({
  upsertOrder: vi.fn(),
}));

import { recordWebhookLog } from "@/lib/webhook-logs";
import { ensureAccountForPurchase } from "@/lib/account/service";
import { upsertOrder } from "@/lib/checkout";

const recordWebhookLogMock = vi.mocked(recordWebhookLog);
const ensureAccountForPurchaseMock = vi.mocked(ensureAccountForPurchase);
const upsertOrderMock = vi.mocked(upsertOrder);

function buildRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/ghl/payment", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-secret": "secret-token",
    },
    body: JSON.stringify(body),
  });
}

async function postWebhook(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/webhooks/ghl/payment/route");
  return POST(buildRequest(body));
}

describe("POST /api/webhooks/ghl/payment", () => {
  beforeEach(() => {
    vi.stubEnv("GHL_PAYMENT_WEBHOOK_SECRET", "secret-token");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("persists order details from GHL payload", async () => {
    const payload = {
      status: "success",
      payment: {
        id: "pay_123",
        payment_status: "paid",
        total_amount: "27.00",
        currency: "usd",
        source: "stripe",
      },
      custom_data: {
        offer_id: "youtube-downloader",
      },
      contact: {
        id: "contact_789",
        email: "buyer@example.com",
        name: "Buyer Example",
      },
    };

    const response = await postWebhook(payload);

    expect(response.status).toBe(200);
    expect(recordWebhookLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentId: "ghl_pay_123",
        status: "success",
      }),
    );
    expect(upsertOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stripePaymentIntentId: "ghl_pay_123",
        stripeSessionId: "ghl_pay_123",
        offerId: "youtube-downloader",
        customerEmail: "buyer@example.com",
        customerName: "Buyer Example",
        amountTotal: 2700,
        currency: "USD",
        paymentStatus: "paid",
        paymentMethod: "stripe",
        source: "ghl",
        metadata: expect.objectContaining({
          ghl: expect.objectContaining({
            paymentId: "pay_123",
            contactId: "contact_789",
          }),
        }),
      }),
    );
    expect(ensureAccountForPurchaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "buyer@example.com",
        name: "Buyer Example",
        offerId: "youtube-downloader",
      }),
    );
  });
});
