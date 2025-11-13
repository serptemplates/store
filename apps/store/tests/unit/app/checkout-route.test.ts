import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { GET } from "@/app/checkout/[slug]/route";
import type { OfferConfig } from "@/lib/products/offer-config";
import type { ProductData } from "@/lib/products/product-schema";

const createSessionMock = vi.fn();
const retrieveProductMock = vi.fn();
import Stripe from "stripe";

vi.mock("@/lib/products/offer-config", () => ({
  getOfferConfig: vi.fn(),
}));

vi.mock("@/lib/products/product", () => ({
  getProductData: vi.fn(),
}));

vi.mock("@/lib/payments/stripe", () => ({
  getStripeClient: vi.fn((mode?: string) => {
    // Return different mocks for live vs test mode
    if (mode === "live") {
      return {
        products: { retrieve: retrieveProductMock },
      };
    }
    return {
      checkout: { sessions: { create: createSessionMock } },
    };
  }),
  resolvePriceForEnvironment: vi.fn(),
}));

describe("GET /checkout/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSessionMock.mockReset();
    retrieveProductMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("injects Dub attribution metadata and redirects to Stripe", async () => {
    const { getOfferConfig } = await import("@/lib/products/offer-config");
    const { getProductData } = await import("@/lib/products/product");
    const { resolvePriceForEnvironment } = await import("@/lib/payments/stripe");

    const getOfferConfigMock = vi.mocked(getOfferConfig);
    const getProductDataMock = vi.mocked(getProductData);
    const resolvePriceForEnvironmentMock = vi.mocked(resolvePriceForEnvironment);

      const productDataMock: ProductData = { status: "live" } as unknown as ProductData;
  getProductDataMock.mockReturnValue(productDataMock as unknown as ProductData);

        const offerConfigMock: OfferConfig = {
          id: "onlyfans-downloader",
          stripePriceId: "price_live_123",
          successUrl: "https://apps.serp.co/checkout/success",
          cancelUrl: "https://apps.serp.co/checkout/cancel",
          mode: "payment",
          productName: "OnlyFans Downloader",
          metadata: { existing: "value" },
          ghl: { tagIds: ["serp-apps"] },
          optionalItems: [
            {
              product_id: "prod_optional_bundle",
              quantity: 1,
            },
          ],
        };
      getOfferConfigMock.mockReturnValue(offerConfigMock);
  
    
    // Mock product retrieval for optional items
    retrieveProductMock.mockResolvedValueOnce({
        id: "prod_optional_bundle",
        name: "Optional Bundle",
        default_price: "price_optional_live_123",
        images: [],
      } as unknown as Stripe.Product);
    
    // Mock price resolution for main item and optional item
      resolvePriceForEnvironmentMock.mockResolvedValueOnce({
        id: "price_test_789",
      } as Stripe.Price);
  resolvePriceForEnvironmentMock.mockResolvedValueOnce({
    id: "price_optional_test_456",
  } as unknown as Stripe.Price);

    createSessionMock.mockResolvedValue({
      url: "https://checkout.stripe.com/cs_test_123",
    } as unknown as Stripe.Checkout.Session);

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
      allow_promotion_codes: true,
      line_items: [
        {
          price: "price_test_789",
          quantity: 2,
          adjustable_quantity: {
            enabled: true,
            minimum: 0,
            maximum: 99,
          },
        },
      ],
      optional_items: [
        {
          price: "price_optional_test_456",
          quantity: 1,
          adjustable_quantity: {
            enabled: true,
            minimum: 0,
            maximum: 1,
          },
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

  it("uses explicit price_id on optional items when provided", async () => {
    const { getOfferConfig } = await import("@/lib/products/offer-config");
    const { getProductData } = await import("@/lib/products/product");
    const { resolvePriceForEnvironment } = await import("@/lib/payments/stripe");

    const getOfferConfigMock = vi.mocked(getOfferConfig);
    const getProductDataMock = vi.mocked(getProductData);
    const resolvePriceForEnvironmentMock = vi.mocked(resolvePriceForEnvironment);

    getProductDataMock.mockReturnValue({ status: "live" } as unknown as ProductData);
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
      optionalItems: [
        {
          product_id: "prod_optional_bundle",
          price_id: "price_live_override_97",
          quantity: 1,
        },
      ],
  } as unknown as OfferConfig);

    // Mock product retrieval for optional items
      retrieveProductMock.mockResolvedValueOnce({
          id: "prod_optional_bundle",
          name: "Optional Bundle",
          default_price: "price_optional_live_123",
          images: [],
        } as unknown as Stripe.Product);

    // Mock price resolution for main item and optional item
      resolvePriceForEnvironmentMock.mockResolvedValueOnce({
        id: "price_test_789",
      } as Stripe.Price);
    resolvePriceForEnvironmentMock.mockResolvedValueOnce({
      id: "price_optional_test_456",
    } as unknown as Stripe.Price);

    createSessionMock.mockResolvedValue({
      url: "https://checkout.stripe.com/cs_test_123",
    });

    const request = new NextRequest("https://store.local/checkout/onlyfans-downloader?qty=1", {
      headers: {
        cookie: "dub_id=affiliate-123",
      },
    });

    const response = await GET(request, {
      params: Promise.resolve({ slug: "onlyfans-downloader" }),
    });

    expect(resolvePriceForEnvironmentMock).toHaveBeenCalledTimes(2);
    // Second call should have used the explicit price override
    const secondCallArg = resolvePriceForEnvironmentMock.mock.calls[1]?.[0];
    expect(secondCallArg).toMatchObject({ priceId: "price_live_override_97" });

    expect(createSessionMock).toHaveBeenCalledTimes(1);
    const params = createSessionMock.mock.calls[0]?.[0];
    expect(params.optional_items?.[0]?.price).toBe("price_optional_test_456");
  });

  it("skips optional items when product default_price is missing and no per-offer price_id", async () => {
    const { getOfferConfig } = await import("@/lib/products/offer-config");
    const { getProductData } = await import("@/lib/products/product");
    const { resolvePriceForEnvironment } = await import("@/lib/payments/stripe");

    const getOfferConfigMock = vi.mocked(getOfferConfig);
    const getProductDataMock = vi.mocked(getProductData);
    const resolvePriceForEnvironmentMock = vi.mocked(resolvePriceForEnvironment);


    getProductDataMock.mockReturnValue({ status: "live" } as unknown as ProductData);
    getOfferConfigMock.mockReturnValue({
      stripePriceId: "price_live_123",
      mode: "payment",
      id: "onlyfans-downloader",
      successUrl: "https://apps.serp.co/checkout/success",
      cancelUrl: "https://apps.serp.co/checkout/cancel",
      productName: "OnlyFans Downloader",
      metadata: { existing: "value" },
      optionalItems: [
        {
          product_id: "prod_optional_bundle",
          quantity: 1,
        },
      ],
    } as unknown as OfferConfig);

    // Mock product retrieval for optional items - product has no default_price
    retrieveProductMock.mockResolvedValueOnce({
      id: "prod_optional_bundle",
      name: "Optional Bundle",
      default_price: null,
      images: [],
    } as unknown as Stripe.Product);

  // Mock price resolution for main item only; optional item should be skipped because it has no price id and product default_price is missing
  resolvePriceForEnvironmentMock.mockResolvedValueOnce({ id: "price_test_789" } as unknown as Stripe.Price);

    createSessionMock.mockResolvedValue({ url: "https://checkout.stripe.com/cs_test_123" } as unknown as Stripe.Checkout.Session);

    const request = new NextRequest("https://store.local/checkout/onlyfans-downloader?qty=1", {
      headers: { cookie: "dub_id=affiliate-123" },
    });
    const response = await GET(request, { params: Promise.resolve({ slug: "onlyfans-downloader" }) });

  // Assert that no second call was made to resolve an optional item price
  expect(resolvePriceForEnvironmentMock).toHaveBeenCalledTimes(1);
  // And ensure no optional_items were passed into the session create params
  const params = createSessionMock.mock.calls[0]?.[0];
  expect(params.optional_items).toBeUndefined();

  // No env var used or set
  });

  it("supports multiple optional items configured per-offer", async () => {
    const { getOfferConfig } = await import("@/lib/products/offer-config");
    const { getProductData } = await import("@/lib/products/product");
    const { resolvePriceForEnvironment } = await import("@/lib/payments/stripe");

    const getOfferConfigMock = vi.mocked(getOfferConfig);
    const getProductDataMock = vi.mocked(getProductData);
    const resolvePriceForEnvironmentMock = vi.mocked(resolvePriceForEnvironment);

    getProductDataMock.mockReturnValue({ status: "live" } as unknown as ProductData);
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
      optionalItems: [
        {
          product_id: "prod_optional_bundle",
          quantity: 1,
        },
        {
          product_id: "prod_license_addon",
          price_id: "price_live_override_10",
          quantity: 1,
        },
      ],
  } as unknown as OfferConfig);

    // Mock product retrieval for both optional items (first has default_price, second has default_price too)
    retrieveProductMock.mockResolvedValueOnce({
      id: "prod_optional_bundle",
      name: "Optional Bundle",
      default_price: "price_optional_live_123",
      images: [],
    } as unknown as Stripe.Product);
    retrieveProductMock.mockResolvedValueOnce({
      id: "prod_license_addon",
      name: "License Addon",
      default_price: "price_license_live_321",
      images: [],
    } as unknown as Stripe.Product);

    // Mock price resolution for main item and both optional items
    resolvePriceForEnvironmentMock.mockResolvedValueOnce({ id: "price_test_789" } as Stripe.Price);
    resolvePriceForEnvironmentMock.mockResolvedValueOnce({ id: "price_optional_test_456" } as unknown as Stripe.Price);
    resolvePriceForEnvironmentMock.mockResolvedValueOnce({ id: "price_license_test_457" } as unknown as Stripe.Price);

    createSessionMock.mockResolvedValue({ url: "https://checkout.stripe.com/cs_test_123" } as unknown as Stripe.Checkout.Session);

    const request = new NextRequest("https://store.local/checkout/onlyfans-downloader?qty=1", {
      headers: { cookie: "dub_id=affiliate-123" },
    });

    const response = await GET(request, { params: Promise.resolve({ slug: "onlyfans-downloader" }) });

    expect(createSessionMock).toHaveBeenCalledTimes(1);
    const params = createSessionMock.mock.calls[0]?.[0];
    expect(params.optional_items?.length).toBe(2);
    expect(params.optional_items?.[0]?.price).toBe("price_optional_test_456");
    expect(params.optional_items?.[1]?.price).toBe("price_license_test_457");
  });
});
