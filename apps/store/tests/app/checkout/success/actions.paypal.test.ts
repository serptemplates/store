import { describe, expect, it, vi } from "vitest";

import { processPaypalOrder } from "@/app/checkout/success/actions";

vi.mock("@/lib/checkout", async () => {
  const actual = await vi.importActual<typeof import("@/lib/checkout")>("@/lib/checkout");
  return {
    ...actual,
    findOrderByPaypalOrderId: vi.fn(),
  };
});

vi.mock("@/lib/products/product", async () => {
  const actual = await vi.importActual<typeof import("@/lib/products/product")>("@/lib/products/product");
  return {
    ...actual,
    getProductData: vi.fn(),
  };
});

const checkoutMocks = vi.mocked(await import("@/lib/checkout"));
const productMocks = vi.mocked(await import("@/lib/products/product"));

describe("processPaypalOrder", () => {
  it("builds conversion data from a stored PayPal order", async () => {
    checkoutMocks.findOrderByPaypalOrderId.mockResolvedValue({
      id: "order-db-id",
      checkoutSessionId: "session-db-id",
      stripeSessionId: "paypal_ORDER123",
      stripePaymentIntentId: "paypal_CAPTURE456",
      stripeChargeId: "CAPTURE456",
      offerId: "youtube-downloader",
      landerId: "youtube-downloader",
      customerEmail: "buyer@example.com",
      customerName: "Buyer Example",
      amountTotal: 1700,
      currency: "usd",
      metadata: {
        couponCode: "WELCOME",
        affiliateId: "aff_123",
        productName: "YouTube Downloader",
        paypalOrderId: "ORDER123",
      },
      paymentStatus: "COMPLETED",
      paymentMethod: "paypal",
      source: "paypal",
      createdAt: new Date(),
      updatedAt: new Date(),
      checkoutSessionStatus: "completed",
      checkoutSessionSource: "paypal",
    });

    productMocks.getProductData.mockReturnValue({
      slug: "youtube-downloader",
      name: "YouTube Downloader",
      pricing: {
        price: "$17.00",
        currency: "USD",
      },
    } as never);

    const result = await processPaypalOrder({ orderId: "ORDER123" });

    expect(result.success).toBe(true);
    expect(result.order?.sessionId).toBe("paypal_ORDER123");
    expect(result.order?.amount).toBe(17);
    expect(result.order?.currency).toBe("USD");
    expect(result.order?.coupon).toBe("WELCOME");
    expect(result.order?.affiliateId).toBe("aff_123");
    expect(result.order?.items?.[0]).toEqual(
      expect.objectContaining({
        id: "youtube-downloader",
        name: "YouTube Downloader",
        price: 17,
        quantity: 1,
      }),
    );
  });

  it("returns failure when no order is found", async () => {
    checkoutMocks.findOrderByPaypalOrderId.mockResolvedValueOnce(null);

    const result = await processPaypalOrder({ orderId: "missing" });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unable to locate/i);
  });
});
