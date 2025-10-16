import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OfferConfig } from "@/lib/products/offer-config";
import type { ProductData } from "@/lib/products/product-schema";

type PayPalCreateOrderResponse = {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method?: string;
  }>;
};

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

vi.mock("@/lib/products/order-bump-definitions", () => ({
  getOrderBumpDefinition: vi.fn(),
}));

vi.mock("@/lib/checkout", () => ({
  markStaleCheckoutSessions: vi.fn(),
  upsertCheckoutSession: vi.fn(),
}));

import { POST } from "@/app/api/paypal/create-order/route";
import { isPayPalConfigured, createPayPalOrder } from "@/lib/payments/paypal";
import { getOfferConfig } from "@/lib/products/offer-config";
import { getProductData } from "@/lib/products/product";
import { markStaleCheckoutSessions, upsertCheckoutSession } from "@/lib/checkout";
import { getOrderBumpDefinition } from "@/lib/products/order-bump-definitions";

const isPayPalConfiguredMock = vi.mocked(isPayPalConfigured);
const createPayPalOrderMock = vi.mocked(createPayPalOrder);
const getOfferConfigMock = vi.mocked(getOfferConfig);
const getProductDataMock = vi.mocked(getProductData);
const markStaleCheckoutSessionsMock = vi.mocked(markStaleCheckoutSessions);
const upsertCheckoutSessionMock = vi.mocked(upsertCheckoutSession);
const getOrderBumpDefinitionMock = vi.mocked(getOrderBumpDefinition);

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
    store_serp_co_product_page_url: "https://store.serp.co/product-details/product/demo",
    apps_serp_co_product_page_url: "https://apps.serp.co/demo",
    serp_co_product_page_url: "https://serp.co/products/demo/",
    serply_link: "https://serp.ly/demo",
    success_url: "https://apps.serp.co/checkout/success?product=demo&session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://apps.serp.co/checkout?product=demo",
    name: "Demo Product",
    tagline: "The best demo",
    description: "Detailed description",
    github_repo_tags: [],
    chrome_webstore_link: undefined,
    firefox_addon_store_link: undefined,
    edge_addons_store_link: undefined,
    producthunt_link: undefined,
    features: [],
    product_videos: [],
    related_videos: [],
    related_posts: [],
    screenshots: [],
    reviews: [],
    faqs: [],
    supported_operating_systems: [],
    categories: [],
    keywords: [],
    supported_regions: [],
    permission_justifications: [],
    pricing: {
      price: "$99",
      benefits: [],
    },
    stripe: {
      price_id: "price_123",
      metadata: {},
    },
    layout_type: "landing",
    status: "live",
    featured: false,
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
    getOrderBumpDefinitionMock.mockReturnValue(undefined);
    const createOrderResponse: PayPalCreateOrderResponse = {
      id: "order_123",
      status: "CREATED",
      links: [],
    };
    createPayPalOrderMock.mockResolvedValue(createOrderResponse);
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

  it("includes order bump metadata and totals when selected", async () => {
    const productWithUpsell: ProductData = {
      ...productFixture,
      pricing: {
        price: "$99.00",
        benefits: [],
      },
      order_bump: {
        slug: "priority-support",
        title: "Priority Support",
        price: "$29.00",
        features: [],
        default_selected: false,
        enabled: true,
        stripe: {
          price_id: "price_priority_support",
          test_price_id: "price_priority_support_test",
        },
      } as ProductData["order_bump"],
    };

    getProductDataMock.mockReturnValueOnce(productWithUpsell);

    const response = await POST(
      buildRequest({
        offerId: "demo-offer",
        orderBump: {
          id: "priority-support",
          selected: true,
        },
      }),
    );

    expect(response.status).toBe(200);

    const paypalParams = createPayPalOrderMock.mock.calls[0]?.[0];
    expect(paypalParams).toMatchObject({
      amount: "128.00",
      offerId: "demo-offer",
    });
    expect(paypalParams.metadata).toMatchObject({
      orderBumpId: "priority-support",
      orderBumpSelected: "true",
      orderBumpUnitCents: "2900",
      orderBumpDisplayPrice: "$29.00",
      checkoutTotalCents: "12800",
      checkoutSubtotalCents: "9900",
      checkoutTotalWithOrderBumpCents: "12800",
    });

    const upsertMetadata = upsertCheckoutSessionMock.mock.calls[0]?.[0]?.metadata ?? {};
    expect(upsertMetadata.orderBumpSelected).toBe("true");
    expect(upsertMetadata.orderBumpUnitCents).toBe("2900");
    expect(upsertMetadata.checkoutTotalCents).toBe("12800");
  });

  it("resolves order bump from referenced product slug", async () => {
    getOrderBumpDefinitionMock.mockReturnValue({
      slug: "serp-downloaders-bundle",
      product_slug: "serp-downloaders-bundle",
      title: "SERP Apps Downloader Library",
      price: "$47.00",
      features: ["Unlock every downloader"],
      default_selected: false,
      stripe: {
        price_id: "price_bundle_live",
        test_price_id: "price_bundle_test",
      },
      enabled: true,
    });

    const referencedProduct: ProductData = {
      ...productFixture,
      slug: "serp-downloaders-bundle",
      name: "SERP Apps Downloader Library",
      pricing: {
        price: "$47.00",
      },
      stripe: {
        price_id: "price_bundle_live",
        test_price_id: "price_bundle_test",
      },
      order_bump: undefined,
    } as ProductData;

    const productWithReference: ProductData = {
      ...productFixture,
      order_bump: {
        enabled: true,
        slug: "serp-downloaders-bundle",
        product_slug: "serp-downloaders-bundle",
      } as ProductData["order_bump"],
    };

    getProductDataMock.mockImplementation((requestedSlug?: string) => {
      if (!requestedSlug || requestedSlug === productWithReference.slug) {
        return productWithReference;
      }
      if (requestedSlug === referencedProduct.slug) {
        return referencedProduct;
      }
      return productFixture;
    });

    const response = await POST(
      buildRequest({
        offerId: productWithReference.slug,
        orderBump: {
          id: "serp-downloaders-bundle",
          selected: true,
        },
      }),
    );

    expect(response.status).toBe(200);

    const paypalParams = createPayPalOrderMock.mock.calls[0]?.[0];
    expect(paypalParams?.amount).toBe("146.00");
    expect(paypalParams?.metadata?.orderBumpDisplayPrice).toBe("$47.00");
    expect(paypalParams?.metadata?.orderBumpUnitCents).toBe("4700");

    const upsertMetadata = upsertCheckoutSessionMock.mock.calls[0]?.[0]?.metadata ?? {};
    expect(upsertMetadata.orderBumpUnitCents).toBe("4700");

    getProductDataMock.mockImplementation(() => productFixture);
  });
});
