import { describe, expect, it, vi, beforeEach } from "vitest";

import type Stripe from "stripe";

import { stripeCheckoutAdapter } from "@/lib/payments/providers/stripe/checkout";
import type { CheckoutRequest } from "@/lib/payments/providers/base";

vi.mock("@/lib/payments/stripe", () => ({
  getStripeClient: vi.fn(),
  resolvePriceForEnvironment: vi.fn(),
}));

const mockPrice = (id: string): Stripe.Price =>
  ({
    id,
  } as unknown as Stripe.Price);

describe("stripeCheckoutAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a checkout session with optional items", async () => {
    const { getStripeClient, resolvePriceForEnvironment } = await import("@/lib/payments/stripe");
    const getStripeClientMock = vi.mocked(getStripeClient);
    const resolvePriceForEnvironmentMock = vi.mocked(resolvePriceForEnvironment);
    const liveClient = {
      products: {
        retrieve: vi.fn().mockResolvedValue({
          id: "prod_optional",
          name: "Optional Bundle",
          description: "Optional",
          images: ["https://img"],
          default_price: "price_optional_live",
        }),
      },
    } as unknown as Stripe;

    const checkoutCreateMock = vi.fn().mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/cs_test_123",
    });

    const checkoutClient = {
      checkout: {
        sessions: {
          create: checkoutCreateMock,
        },
      },
    } as unknown as Stripe;

    getStripeClientMock.mockImplementation((options?: unknown) => {
      const opts = options as { mode?: string } | undefined;
      if (opts?.mode === "live") {
        return liveClient;
      }
      return checkoutClient;
    });

    resolvePriceForEnvironmentMock
      .mockResolvedValueOnce(mockPrice("price_test_main"))
      .mockResolvedValueOnce(mockPrice("price_optional_test"));

    const request: CheckoutRequest = {
      slug: "onlyfans-downloader",
      mode: "payment",
      quantity: 2,
      metadata: { product_slug: "onlyfans-downloader" },
      customerEmail: "devin@serp.co",
      clientReferenceId: "dub_id_affiliate-123",
      successUrl: "https://apps.serp.co/checkout/success",
      cancelUrl: "https://apps.serp.co/checkout/cancel",
      price: {
        id: "price_live_123",
        productName: "OnlyFans Downloader",
      },
      optionalItems: [
        {
          productId: "prod_optional",
          quantity: 1,
        },
      ],
      paymentAccountAlias: "primary",
    };

    const response = await stripeCheckoutAdapter.createCheckout(request);

    expect(resolvePriceForEnvironmentMock).toHaveBeenCalledTimes(2);
    expect(resolvePriceForEnvironmentMock).toHaveBeenCalledWith(
      expect.objectContaining({ priceId: "price_live_123" }),
      expect.objectContaining({ accountAlias: "primary" }),
    );
    expect(resolvePriceForEnvironmentMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "prod_optional" }),
      expect.objectContaining({ syncWithLiveProduct: true }),
    );

    expect(getStripeClientMock).toHaveBeenCalledWith({ mode: "live", accountAlias: "primary" });
    expect(getStripeClientMock).toHaveBeenCalledWith({ accountAlias: "primary" });

    expect(checkoutCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: "dub_id_affiliate-123",
        customer_email: "devin@serp.co",
        optional_items: [
          expect.objectContaining({
            price: "price_optional_test",
            quantity: 1,
          }),
        ],
      }),
    );

    expect(response).toEqual({
      provider: "stripe",
      redirectUrl: "https://checkout.stripe.com/cs_test_123",
      sessionId: "cs_test_123",
      providerSessionId: "cs_test_123",
    });
  });

  it("throws when Stripe does not return a checkout URL", async () => {
    const { getStripeClient, resolvePriceForEnvironment } = await import("@/lib/payments/stripe");
    const getStripeClientMock = vi.mocked(getStripeClient);
    const resolvePriceForEnvironmentMock = vi.mocked(resolvePriceForEnvironment);

    getStripeClientMock.mockReturnValue({
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({ id: "cs_test_123", url: null }),
        },
      },
    } as unknown as Stripe);

    resolvePriceForEnvironmentMock.mockResolvedValue(mockPrice("price_test_main"));

    const request: CheckoutRequest = {
      slug: "onlyfans-downloader",
      mode: "payment",
      quantity: 1,
      metadata: {},
      successUrl: "https://apps.serp.co/checkout/success",
      cancelUrl: "https://apps.serp.co/checkout/cancel",
      price: { id: "price_live_123" },
    };

    await expect(stripeCheckoutAdapter.createCheckout(request)).rejects.toThrow(
      /Stripe did not return a checkout URL/,
    );
  });
});
