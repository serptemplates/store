import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { GET } from "@/app/checkout/[slug]/route";

const createSessionMock = vi.fn();

vi.mock("@/lib/products/offer-config", () => ({
  getOfferConfig: vi.fn(),
}));

vi.mock("@/lib/products/product", () => ({
  getProductData: vi.fn(),
}));

vi.mock("@/lib/payments/stripe", () => ({
  getStripeClient: vi.fn(() => ({
    checkout: { sessions: { create: createSessionMock } },
  })),
  resolvePriceForEnvironment: vi.fn(),
}));

describe("GET /checkout/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSessionMock.mockReset();
  });

  it("injects Dub attribution metadata and redirects to Stripe", async () => {
    const { getOfferConfig } = await import("@/lib/products/offer-config");
    const { getProductData } = await import("@/lib/products/product");
    const { resolvePriceForEnvironment } = await import("@/lib/payments/stripe");

    const getOfferConfigMock = vi.mocked(getOfferConfig);
    const getProductDataMock = vi.mocked(getProductData);
    const resolvePriceForEnvironmentMock = vi.mocked(resolvePriceForEnvironment);

    getProductDataMock.mockReturnValue({
      status: "live",
    } as any);
    getOfferConfigMock.mockReturnValue({
      stripePriceId: "price_live_123",
      mode: "payment",
      id: "onlyfans-downloader",
      successUrl: "https://apps.serp.co/checkout/success",
      cancelUrl: "https://apps.serp.co/checkout/cancel",
      productName: "OnlyFans Downloader",
      metadata: {
        existing: "value",
      },
      ghl: {
        tagIds: ["serp-apps"],
      },
    } as any);
    resolvePriceForEnvironmentMock.mockResolvedValue({
      id: "price_test_789",
    } as any);

    createSessionMock.mockResolvedValue({
      url: "https://checkout.stripe.com/cs_test_123",
    });

    const request = new NextRequest("https://store.local/checkout/onlyfans-downloader?qty=2", {
      headers: {
        cookie: "dub_id=affiliate-123",
      },
    });

    const response = await GET(request, {
      params: Promise.resolve({ slug: "onlyfans-downloader" }),
    });

    expect(createSessionMock).toHaveBeenCalledTimes(1);
    const params = createSessionMock.mock.calls[0]?.[0];

    expect(params).toMatchObject({
      mode: "payment",
      client_reference_id: "dub_id_affiliate-123",
      line_items: [
        {
          price: "price_test_789",
          quantity: 2,
        },
      ],
      cancel_url: "https://apps.serp.co/checkout/cancel",
      success_url: "https://apps.serp.co/checkout/success",
    });

    expect(params.metadata).toMatchObject({
      product_slug: "onlyfans-downloader",
      productSlug: "onlyfans-downloader",
      dubCustomerExternalId: "dub_id_affiliate-123",
      dubClickId: "dub_id_affiliate-123",
      affiliateId: "affiliate-123",
      ghl_tag: "serp-apps",
      ghlTag: "serp-apps",
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://checkout.stripe.com/cs_test_123");
  });
});
