import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { GET } from "@/app/checkout/[slug]/route";
import type { OfferConfig } from "@/lib/products/offer-config";
import type { ProductData } from "@/lib/products/product-schema";

vi.mock("@/lib/products/offer-config", () => ({
  getOfferConfig: vi.fn(),
}));

vi.mock("@/lib/products/product", () => ({
  getProductData: vi.fn(),
}));

vi.mock("@/lib/payments/payment-router", () => ({
  createCheckoutSessionForOffer: vi.fn(),
}));

describe("GET /checkout/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards metadata and dub attribution to the payment router", async () => {
    const { getOfferConfig } = await import("@/lib/products/offer-config");
    const { getProductData } = await import("@/lib/products/product");
    const { createCheckoutSessionForOffer } = await import("@/lib/payments/payment-router");
    const createCheckoutSessionForOfferMock = vi.mocked(createCheckoutSessionForOffer);

    const mockedProduct = { status: "live" } as ProductData;
    vi.mocked(getProductData).mockReturnValue(mockedProduct);

    const offer: OfferConfig = {
      id: "onlyfans-downloader",
      stripePriceId: "price_live_123",
      successUrl: "https://apps.serp.co/checkout/success",
      cancelUrl: "https://apps.serp.co/checkout/cancel",
      mode: "payment",
      productName: "OnlyFans Downloader",
      metadata: { existing: "value" },
      ghl: { tagIds: ["purchase-onlyfans-downloader"] },
    } as OfferConfig;
    vi.mocked(getOfferConfig).mockReturnValue(offer);

    createCheckoutSessionForOfferMock.mockResolvedValue({
      provider: "stripe",
      redirectUrl: "https://checkout.stripe.com/cs_test_123",
      sessionId: "cs_test_123",
      providerSessionId: "cs_test_123",
    });

    const request = new NextRequest("https://store.local/checkout/onlyfans-downloader?qty=2", {
      headers: {
        cookie: "dub_id=affiliate-123",
      },
    });

    const response = await GET(request, {
      params: Promise.resolve({ slug: "onlyfans-downloader" }),
    });

    expect(createCheckoutSessionForOfferMock).toHaveBeenCalledTimes(1);
    const args = createCheckoutSessionForOfferMock.mock.calls[0]?.[0];
    expect(args?.quantity).toBe(2);
    expect(args?.clientReferenceId).toBe("dub_id_affiliate-123");
    expect(args?.metadata).toMatchObject({
      product_slug: "onlyfans-downloader",
      productSlug: "onlyfans-downloader",
      dubCustomerExternalId: "dub_id_affiliate-123",
      dubClickId: "dub_id_affiliate-123",
      affiliateId: "affiliate-123",
      ghl_tag: "purchase-onlyfans-downloader",
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://checkout.stripe.com/cs_test_123");
  });

  it("returns JSON error when router throws", async () => {
    const { getOfferConfig } = await import("@/lib/products/offer-config");
    const { getProductData } = await import("@/lib/products/product");
    const { createCheckoutSessionForOffer } = await import("@/lib/payments/payment-router");
    const createCheckoutSessionForOfferMock = vi.mocked(createCheckoutSessionForOffer);

    vi.mocked(getProductData).mockReturnValue({ status: "live" } as ProductData);
    vi.mocked(getOfferConfig).mockReturnValue({
      id: "onlyfans-downloader",
      stripePriceId: "price_live_123",
      successUrl: "https://apps.serp.co/checkout/success",
      cancelUrl: "https://apps.serp.co/checkout/cancel",
      mode: "payment",
      metadata: {},
    } as OfferConfig);

    createCheckoutSessionForOfferMock.mockRejectedValue(new Error("adapter failure"));

    const request = new NextRequest("https://store.local/checkout/onlyfans-downloader", {
      headers: {
        cookie: "dub_id=affiliate-123",
      },
    });

    const response = await GET(request, {
      params: Promise.resolve({ slug: "onlyfans-downloader" }),
    });

    expect(response.status).toBe(500);
    const payload = await response.json();
    expect(payload.error).toContain("adapter failure");
  });

  it("redirects pre-release products to the waitlist", async () => {
    const { getOfferConfig } = await import("@/lib/products/offer-config");
    const { getProductData } = await import("@/lib/products/product");

    vi.mocked(getProductData).mockReturnValue({ status: "pre_release", waitlist_url: "/wait" } as ProductData);
    vi.mocked(getOfferConfig).mockReturnValue(null);

    const request = new NextRequest("https://store.local/checkout/onlyfans-downloader");
    const response = await GET(request, {
      params: Promise.resolve({ slug: "onlyfans-downloader" }),
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://store.local/wait");
    const { createCheckoutSessionForOffer } = await import("@/lib/payments/payment-router");
    expect(vi.mocked(createCheckoutSessionForOffer)).not.toHaveBeenCalled();
  });
});
