import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OfferConfig } from "@/lib/products/offer-config";
import type { ProductData } from "@/lib/products/product-schema";

vi.mock("@/lib/payments/paypal", () => ({
  isPayPalConfigured: vi.fn(),
  createPayPalOrder: vi.fn(),
}));

vi.mock("@/lib/products/offer-config", () => ({
  getOfferConfig: vi.fn(),
}));

vi.mock("@/lib/products/product", () => ({
  getProductData: vi.fn(),
}));

vi.mock("@/lib/checkout/store", () => ({
  markStaleCheckoutSessions: vi.fn(),
  upsertCheckoutSession: vi.fn(),
}));

import { POST } from "@/app/api/paypal/create-order/route";
import { isPayPalConfigured, createPayPalOrder } from "@/lib/payments/paypal";
import { getOfferConfig } from "@/lib/products/offer-config";
import { getProductData } from "@/lib/products/product";
import { markStaleCheckoutSessions, upsertCheckoutSession } from "@/lib/checkout/store";

const isPayPalConfiguredMock = vi.mocked(isPayPalConfigured);
const createPayPalOrderMock = vi.mocked(createPayPalOrder);
const getOfferConfigMock = vi.mocked(getOfferConfig);
const getProductDataMock = vi.mocked(getProductData);
const markStaleCheckoutSessionsMock = vi.mocked(markStaleCheckoutSessions);
const upsertCheckoutSessionMock = vi.mocked(upsertCheckoutSession);

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/paypal/create-order", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/paypal/create-order", () => {
  const productFixture: ProductData = {
    slug: "demo-offer",
    seo_title: "Demo Product",
    seo_description: "Test product",
    product_page_url: "https://example.com/demo",
    purchase_url: "https://example.com/demo/buy",
    name: "Demo Product",
    tagline: "The best demo",
    description: "Detailed description",
    github_repo_tags: [],
    features: [],
    product_videos: [],
    related_videos: [],
    screenshots: [],
    reviews: [],
    faqs: [],
    supported_operating_systems: [],
    categories: [],
    keywords: [],
    pricing: {
      price: "$99",
      benefits: [],
    },
    stripe: {
      price_id: "price_123",
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
      metadata: {},
    },
    layout_type: "landing",
    pre_release: false,
    new_release: false,
    popular: false,
    brand: "SERP Apps",
  };

  const offerConfigFixture: OfferConfig = {
    id: "demo-offer",
    stripePriceId: "price_123",
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    mode: "payment",
    metadata: {},
    productName: "Demo Product",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    isPayPalConfiguredMock.mockReturnValue(true);
    getOfferConfigMock.mockReturnValue(offerConfigFixture);
    getProductDataMock.mockReturnValue(productFixture);
    createPayPalOrderMock.mockResolvedValue({
      id: "order_123",
      status: "CREATED",
      links: [],
    } as any);
  });

  it("creates a PayPal order and persists checkout session", async () => {
    const response = await POST(
      buildRequest({
        offerId: "demo-offer",
        quantity: 2,
        affiliateId: "AFF123",
        metadata: { source: "test" },
        customer: { email: "buyer@example.com", name: "Buyer" },
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { orderId: string };
    expect(payload.orderId).toBe("order_123");

    expect(markStaleCheckoutSessionsMock).toHaveBeenCalled();

    expect(createPayPalOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "198.00",
        offerId: "demo-offer",
        metadata: expect.objectContaining({ affiliateId: "AFF123", customerEmail: "buyer@example.com" }),
      }),
    );

    expect(upsertCheckoutSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeSessionId: "paypal_order_123",
        offerId: "demo-offer",
        source: "paypal",
        metadata: expect.objectContaining({ paypalOrderId: "order_123", source: "paypal" }),
      }),
    );
  });

  it("rejects when PayPal is not configured", async () => {
    isPayPalConfiguredMock.mockReturnValue(false);

    const response = await POST(buildRequest({ offerId: "demo" }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "PayPal is not configured" });
  });

  it("validates request payload", async () => {
    const response = await POST(buildRequest({ quantity: 1 }));

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toContain("Required");
  });

  it("returns 404 when offer missing", async () => {
    getOfferConfigMock.mockReturnValue(null);

    const response = await POST(buildRequest({ offerId: "missing" }));
    expect(response.status).toBe(404);
  });

  it("handles PayPal order failures gracefully", async () => {
    createPayPalOrderMock.mockRejectedValue(new Error("api down"));

    const response = await POST(buildRequest({ offerId: "demo-offer" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: "Failed to create PayPal order" });
  });
});
