import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type Stripe from "stripe";

import {
  resetStripeCheckoutDependencies,
  setStripeCheckoutDependencies,
  stripeCheckoutAdapter,
} from "@/lib/payments/providers/stripe/checkout";
import type { CheckoutRequest } from "@/lib/payments/providers/base";

const mockPrice = (id: string): Stripe.Price =>
  ({
    id,
  } as unknown as Stripe.Price);

describe("stripeCheckoutAdapter", () => {
  const getStripeClientMock = vi.fn();
  const resolvePriceForEnvironmentMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setStripeCheckoutDependencies({
      getStripeClient: getStripeClientMock,
      resolvePriceForEnvironment: resolvePriceForEnvironmentMock,
    });
  });

  afterEach(() => {
    resetStripeCheckoutDependencies();
  });

  it("creates a checkout session with optional items", async () => {
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

  it("adds a setup fee line item for subscription checkouts", async () => {
    const checkoutCreateMock = vi.fn().mockResolvedValue({
      id: "cs_test_456",
      url: "https://checkout.stripe.com/cs_test_456",
    });

    getStripeClientMock.mockReturnValue({
      checkout: {
        sessions: {
          create: checkoutCreateMock,
        },
      },
    } as unknown as Stripe);

    resolvePriceForEnvironmentMock
      .mockResolvedValueOnce(mockPrice("price_test_main"))
      .mockResolvedValueOnce(mockPrice("price_setup_test"));

    const request: CheckoutRequest = {
      slug: "vimeo-video-downloader",
      mode: "subscription",
      quantity: 1,
      metadata: { product_slug: "vimeo-video-downloader" },
      successUrl: "https://apps.serp.co/checkout/success",
      cancelUrl: "https://apps.serp.co/checkout/cancel",
      price: {
        id: "price_test_main",
        productName: "Vimeo Video Downloader",
      },
      providerConfig: {
        provider: "stripe",
        stripe: {
          price_id: "price_live_main",
          test_price_id: "price_test_main",
          metadata: {
            setup_fee_price_id: "price_setup_live",
            setup_fee_test_price_id: "price_setup_test",
          },
        },
      },
    };

    await stripeCheckoutAdapter.createCheckout(request);

    expect(resolvePriceForEnvironmentMock).toHaveBeenCalledTimes(2);
    expect(checkoutCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        line_items: [
          expect.objectContaining({ price: "price_test_main", quantity: 1 }),
          expect.objectContaining({ price: "price_setup_test", quantity: 1 }),
        ],
      }),
    );
  });
});
