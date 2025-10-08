import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OfferConfig } from "@/lib/products/offer-config";
import type { CheckoutSessionRecord } from "@/lib/checkout/store";

vi.mock("@/lib/payments/paypal", () => ({
  isPayPalConfigured: vi.fn(),
  capturePayPalOrder: vi.fn(),
}));

vi.mock("@/lib/checkout/store", () => ({
  findCheckoutSessionByStripeSessionId: vi.fn(),
  updateCheckoutSessionStatus: vi.fn(),
  upsertOrder: vi.fn(),
}));

vi.mock("@/lib/ghl-client", () => ({
  syncOrderWithGhl: vi.fn(),
}));

vi.mock("@/lib/products/offer-config", () => ({
  getOfferConfig: vi.fn(),
}));

import { POST } from "@/app/api/paypal/capture-order/route";
import { isPayPalConfigured, capturePayPalOrder } from "@/lib/payments/paypal";
import {
  findCheckoutSessionByStripeSessionId,
  updateCheckoutSessionStatus,
  upsertOrder,
} from "@/lib/checkout/store";
import { syncOrderWithGhl } from "@/lib/ghl-client";
import { getOfferConfig } from "@/lib/products/offer-config";

const isPayPalConfiguredMock = vi.mocked(isPayPalConfigured);
const capturePayPalOrderMock = vi.mocked(capturePayPalOrder);
const findCheckoutSessionByStripeSessionIdMock = vi.mocked(findCheckoutSessionByStripeSessionId);
const updateCheckoutSessionStatusMock = vi.mocked(updateCheckoutSessionStatus);
const upsertOrderMock = vi.mocked(upsertOrder);
const syncOrderWithGhlMock = vi.mocked(syncOrderWithGhl);
const getOfferConfigMock = vi.mocked(getOfferConfig);

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/paypal/capture-order", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/paypal/capture-order", () => {
  const offerConfigFixture: OfferConfig = {
    id: "demo-offer",
    stripePriceId: "price_123",
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    mode: "payment",
    metadata: {
      productPageUrl: "https://store.example.com/products/demo-offer",
      purchaseUrl: "https://store.example.com/checkout/demo-offer",
    },
    productName: "Demo Offer",
    ghl: {},
  };

  const checkoutSessionFixture: CheckoutSessionRecord = {
    id: "checkout-id",
    stripeSessionId: "paypal_order_123",
    stripePaymentIntentId: null,
    offerId: "demo-offer",
    landerId: "demo-offer",
    customerEmail: "buyer@example.com",
    metadata: {
      productPageUrl: "https://store.example.com/products/demo-offer",
      purchaseUrl: "https://store.example.com/checkout/demo-offer",
    },
    status: "pending",
    source: "paypal",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    isPayPalConfiguredMock.mockReturnValue(true);
    capturePayPalOrderMock.mockResolvedValue({
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
    } as any);

    findCheckoutSessionByStripeSessionIdMock.mockResolvedValue(checkoutSessionFixture);

    getOfferConfigMock.mockReturnValue(offerConfigFixture);
  });

  it("captures payment, persists order, and triggers GHL sync", async () => {
    const response = await POST(buildRequest({ orderId: "order_123" }));

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { orderId: string };
    expect(payload.orderId).toBe("order_123");

    expect(capturePayPalOrderMock).toHaveBeenCalledWith("order_123");
    expect(updateCheckoutSessionStatusMock).toHaveBeenCalledWith(
      "paypal_order_123",
      "completed",
      expect.objectContaining({
        metadata: expect.objectContaining({
          productPageUrl: "https://store.example.com/products/demo-offer",
          purchaseUrl: "https://store.example.com/checkout/demo-offer",
        }),
      }),
    );

    const upsertCall = upsertOrderMock.mock.calls[0][0] as Record<string, unknown>;
    expect(upsertCall).toMatchObject({
      stripeSessionId: "paypal_order_123",
      stripePaymentIntentId: "paypal_capture_123",
      amountTotal: 9900,
      customerEmail: "buyer@example.com",
      paymentStatus: "COMPLETED",
      source: "paypal",
    });

    expect(syncOrderWithGhlMock).toHaveBeenCalledWith(
      offerConfigFixture.ghl,
      expect.objectContaining({
        offerId: "demo-offer",
        customerEmail: "buyer@example.com",
        amountTotal: 9900,
        provider: "paypal",
        productPageUrl: "https://store.example.com/products/demo-offer",
        purchaseUrl: "https://store.example.com/checkout/demo-offer",
        licenseEntitlements: ["demo-offer"],
        licenseTier: "demo-offer",
      }),
    );
  });

  it("skips GHL sync errors without failing capture", async () => {
    syncOrderWithGhlMock.mockRejectedValue(new Error("ghl down"));

    const response = await POST(buildRequest({ orderId: "order_123" }));
    expect(response.status).toBe(200);
  });

  it("requires PayPal configuration", async () => {
    isPayPalConfiguredMock.mockReturnValue(false);

    const response = await POST(buildRequest({ orderId: "order" }));
    expect(response.status).toBe(503);
  });

  it("handles capture failures", async () => {
    capturePayPalOrderMock.mockRejectedValue(new Error("api down"));

    const response = await POST(buildRequest({ orderId: "order" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: "Failed to capture PayPal payment" });
  });
});
