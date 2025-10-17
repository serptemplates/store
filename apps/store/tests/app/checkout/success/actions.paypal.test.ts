import { describe, expect, it, vi } from "vitest";

import { processPaypalOrder } from "@/app/checkout/success/actions";

vi.mock("@/lib/checkout", async () => {
  const actual = await vi.importActual<typeof import("@/lib/checkout")>("@/lib/checkout");
  return {
    ...actual,
    findOrderByPaypalOrderId: vi.fn(),
    findCheckoutSessionByStripeSessionId: vi.fn(),
    updateCheckoutSessionStatus: vi.fn(),
    upsertOrder: vi.fn(),
  };
});

vi.mock("@/lib/products/product", async () => {
  const actual = await vi.importActual<typeof import("@/lib/products/product")>("@/lib/products/product");
  return {
    ...actual,
    getProductData: vi.fn(),
  };
});

vi.mock("@/lib/payments/paypal", async () => {
  const actual = await vi.importActual<typeof import("@/lib/payments/paypal")>("@/lib/payments/paypal");
  return {
    ...actual,
    capturePayPalOrder: vi.fn(),
    isPayPalConfigured: vi.fn(() => true),
  };
});

vi.mock("@/lib/ghl-client", async () => {
  return {
    syncOrderWithGhl: vi.fn(),
  };
});

vi.mock("@/lib/license-service", async () => {
  return {
    createLicenseForOrder: vi.fn(),
  };
});

vi.mock("@/lib/products/offer-config", async () => {
  return {
    getOfferConfig: vi.fn(),
  };
});

const checkoutMocks = vi.mocked(await import("@/lib/checkout"));
const productMocks = vi.mocked(await import("@/lib/products/product"));
const paypalMocks = vi.mocked(await import("@/lib/payments/paypal"));
const ghlMocks = vi.mocked(await import("@/lib/ghl-client"));
const licenseMocks = vi.mocked(await import("@/lib/license-service"));
const offerMocks = vi.mocked(await import("@/lib/products/offer-config"));

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
    } as ReturnType<typeof productMocks.getProductData>);

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

  it("returns failure when no order is found and capture fails", async () => {
    // Mock findOrderByPaypalOrderId to return null both times (before and after capture attempt)
    checkoutMocks.findOrderByPaypalOrderId.mockResolvedValue(null);

    const result = await processPaypalOrder({ orderId: "missing" });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unable to locate or process/i);
  });

  it("attempts to capture order when not found in database", async () => {
    // Mock PayPal capture response
    paypalMocks.capturePayPalOrder.mockResolvedValue({
      status: "COMPLETED",
      payer: {
        email_address: "user@example.com",
        name: {
          given_name: "Test",
          surname: "User",
        },
      },
      purchase_units: [{
        payments: {
          captures: [{
            id: "CAPTURE789",
            amount: {
              value: "27.00",
              currency_code: "USD",
            },
          }],
        },
      }],
    });

    // Mock checkout session
    checkoutMocks.findCheckoutSessionByStripeSessionId.mockResolvedValue({
      id: "session-db-id",
      stripeSessionId: "paypal_ORDER456",
      offerId: "instagram-downloader",
      landerId: "instagram-downloader",
      customerEmail: "user@example.com",
      metadata: {
        source: "paypal",
      },
      status: "pending",
      source: "paypal",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Awaited<ReturnType<typeof checkoutMocks.findCheckoutSessionByStripeSessionId>>);

    // Mock offer config
    offerMocks.getOfferConfig.mockReturnValue({
      productName: "Instagram Downloader",
      metadata: {},
    } as ReturnType<typeof offerMocks.getOfferConfig>);

    // Mock license creation
    licenseMocks.createLicenseForOrder.mockResolvedValue({
      action: "created",
      licenseId: "lic_123",
      licenseKey: "KEY-123-456",
    });

    // Mock order upsert
    checkoutMocks.upsertOrder.mockResolvedValue("order-db-id");

    // Mock session status update
    checkoutMocks.updateCheckoutSessionStatus.mockResolvedValue(undefined);

    // Mock GHL sync
    ghlMocks.syncOrderWithGhl.mockResolvedValue(null);

    // First call returns null (order not found)
    // Second call after capture returns the order
    checkoutMocks.findOrderByPaypalOrderId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "order-db-id",
        checkoutSessionId: "session-db-id",
        stripeSessionId: "paypal_ORDER456",
        stripePaymentIntentId: "paypal_CAPTURE789",
        stripeChargeId: "CAPTURE789",
        offerId: "instagram-downloader",
        landerId: "instagram-downloader",
        customerEmail: "user@example.com",
        customerName: "Test User",
        amountTotal: 2700,
        currency: "usd",
        metadata: {
          paypalOrderId: "ORDER456",
          source: "paypal",
          licenseKey: "KEY-123-456",
          licenseId: "lic_123",
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
      slug: "instagram-downloader",
      name: "Instagram Downloader",
      pricing: {
        price: "$27.00",
        currency: "USD",
      },
    } as ReturnType<typeof productMocks.getProductData>);

    const result = await processPaypalOrder({ orderId: "ORDER456" });

    expect(result.success).toBe(true);
    expect(result.order?.amount).toBe(27);
    expect(paypalMocks.capturePayPalOrder).toHaveBeenCalledWith("ORDER456");
    expect(checkoutMocks.findOrderByPaypalOrderId).toHaveBeenCalledTimes(2);
    expect(checkoutMocks.upsertOrder).toHaveBeenCalled();
    expect(licenseMocks.createLicenseForOrder).toHaveBeenCalled();
  });
});
