import { NextRequest } from "next/server";
import { describe, expect, it, beforeEach, vi } from "vitest";
import type Stripe from "stripe";

type StripeSessionWithResponse = Stripe.Checkout.Session & {
  lastResponse: Stripe.Response<Stripe.Checkout.Session>["lastResponse"];
};

vi.mock("@/lib/products/offer-config", () => ({
  getOfferConfig: vi.fn(),
}));

vi.mock("@/lib/payments/stripe", () => ({
  getStripeClient: vi.fn(),
  isUsingTestKeys: vi.fn(() => false),
  resolvePriceForEnvironment: vi.fn(),
}));

vi.mock("@/lib/checkout", () => ({
  markStaleCheckoutSessions: vi.fn(),
  upsertCheckoutSession: vi.fn(),
}));

vi.mock("@/lib/checkout/simple-checkout", () => ({
  createSimpleCheckout: vi.fn(),
}));

vi.mock("@/lib/products/product", () => ({
  getProductData: vi.fn(),
}));

import { POST } from "@/app/api/checkout/session/route";
import { getOfferConfig } from "@/lib/products/offer-config";
import { getStripeClient, isUsingTestKeys, resolvePriceForEnvironment } from "@/lib/payments/stripe";
import { markStaleCheckoutSessions, upsertCheckoutSession } from "@/lib/checkout";
import { createSimpleCheckout } from "@/lib/checkout/simple-checkout";
import { getProductData } from "@/lib/products/product";

const getOfferConfigMock = vi.mocked(getOfferConfig);
const getStripeClientMock = vi.mocked(getStripeClient);
const resolvePriceForEnvironmentMock = vi.mocked(resolvePriceForEnvironment);
const isUsingTestKeysMock = vi.mocked(isUsingTestKeys);
const markStaleCheckoutSessionsMock = vi.mocked(markStaleCheckoutSessions);
const upsertCheckoutSessionMock = vi.mocked(upsertCheckoutSession);
const createSimpleCheckoutMock = vi.mocked(createSimpleCheckout);
const getProductDataMock = vi.mocked(getProductData);

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/checkout/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isUsingTestKeysMock.mockReturnValue(false);
    getProductDataMock.mockReturnValue({
      slug: "demo-offer",
      name: "Demo Product",
      pricing: { price: "$99.00" },
    } as unknown as ReturnType<typeof getProductData>);
  });

  it("creates a Stripe checkout session when offer is configured", async () => {
    const offer = {
      id: "demo-offer",
      mode: "payment" as const,
      stripePriceId: "price_123",
      productName: "Demo Product",
      productDescription: "Test description",
      productImage: "https://example.com/product.png",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      metadata: {
        landerId: "demo-lander",
      },
    };

    const stripeSessionResponse: StripeSessionWithResponse = {
      id: "cs_test_checkout",
      object: "checkout.session",
      payment_intent: "pi_test_checkout",
      payment_status: "unpaid",
      status: "open",
      mode: "payment",
      amount_total: 19800,
      amount_subtotal: 19800,
      currency: "usd",
      customer_email: "buyer@example.com",
      customer_details: null,
      metadata: {},
      url: "https://stripe.example.com/session",
      lastResponse: {
        headers: {},
        requestId: "req_test_checkout",
        statusCode: 200,
        apiVersion: "2024-04-10",
        idempotencyKey: undefined,
        stripeAccount: undefined,
      },
    } as StripeSessionWithResponse;

    const createStripeSession = vi.fn().mockResolvedValue(stripeSessionResponse);
    const retrieveProductMock = vi.fn().mockResolvedValue({
      id: "prod_123",
      name: offer.productName,
      description: offer.productDescription,
      images: [offer.productImage],
    });

    const stripeClient = {
      checkout: {
        sessions: {
          create: createStripeSession,
        },
      },
      products: {
        update: vi.fn().mockResolvedValue({}),
        retrieve: retrieveProductMock,
      },
    } as unknown as ReturnType<typeof getStripeClient>;

    getOfferConfigMock.mockReturnValue(offer as ReturnType<typeof getOfferConfig>);
    getStripeClientMock.mockReturnValue(stripeClient);
    resolvePriceForEnvironmentMock.mockResolvedValue({
      id: offer.stripePriceId,
      currency: "usd",
      product: "prod_123",
    } as unknown as Stripe.Price);
    markStaleCheckoutSessionsMock.mockResolvedValue(undefined);
    upsertCheckoutSessionMock.mockResolvedValue("session-db-id");

    const request = buildRequest({
      offerId: offer.id,
      quantity: 2,
      affiliateId: "AFF123",
      metadata: {
        landerId: offer.metadata.landerId,
      },
      customer: {
        email: "buyer@example.com",
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { id: string; url: string };
    expect(payload.id).toBe(stripeSessionResponse.id);
    expect(payload.url).toBe(stripeSessionResponse.url);

    expect(createStripeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        success_url: offer.successUrl,
        cancel_url: offer.cancelUrl,
        line_items: [
          {
            price: offer.stripePriceId,
            quantity: 2,
          },
        ],
      }),
    );

    const sessionPayload = createStripeSession.mock.calls[0][0];
    expect(sessionPayload.metadata).toMatchObject({
      offerId: offer.id,
      landerId: offer.metadata.landerId,
      affiliateId: "AFF123",
      environment: "live",
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(upsertCheckoutSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeSessionId: stripeSessionResponse.id,
        offerId: offer.id,
        status: "pending",
      }),
    );
  });

  it("falls back to simple checkout when offer is not configured", async () => {
    getOfferConfigMock.mockReturnValue(null);
    markStaleCheckoutSessionsMock.mockResolvedValue(undefined);
    upsertCheckoutSessionMock.mockResolvedValue("simple-session-id");

    const simpleCheckoutSession: StripeSessionWithResponse = {
      id: "simple_checkout_123",
      object: "checkout.session",
      payment_intent: "pi_simple",
      payment_status: "unpaid",
      status: "open",
      mode: "payment",
      amount_total: 9900,
      amount_subtotal: 9900,
      currency: "usd",
      customer_email: "buyer@example.com",
      customer_details: null,
      metadata: {},
      url: "https://example.com/simple-checkout",
      lastResponse: {
        headers: {},
        requestId: "req_simple_checkout",
        statusCode: 200,
        apiVersion: "2024-04-10",
        idempotencyKey: undefined,
        stripeAccount: undefined,
      },
    } as StripeSessionWithResponse;

    createSimpleCheckoutMock.mockResolvedValue(simpleCheckoutSession);

    const request = buildRequest({
      offerId: "unknown-offer",
      customer: {
        email: "buyer@example.com",
      },
    });

    getProductDataMock.mockReturnValueOnce({
      slug: "unknown-offer",
      name: "Fallback Product",
      pricing: { price: "$99.00" },
    } as unknown as ReturnType<typeof getProductData>);

    const response = await POST(request);
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { id: string; url: string };
    expect(payload.id).toBe(simpleCheckoutSession.id);
    expect(payload.url).toBe(simpleCheckoutSession.url);

    expect(createSimpleCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        offerId: "unknown-offer",
      }),
    );
    expect(getStripeClientMock).not.toHaveBeenCalled();
    expect(upsertCheckoutSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeSessionId: simpleCheckoutSession.id,
        status: "pending",
      }),
    );
  });

  it("returns validation errors for bad payloads", async () => {
    const response = await POST(buildRequest({ quantity: 1 }));
    expect(response.status).toBe(400);

    const payload = (await response.json()) as { error: string };
    expect(payload.error).toContain("Required");
  });

  it("handles Stripe errors gracefully", async () => {
    const offer = {
      id: "demo-offer",
      mode: "payment" as const,
      stripePriceId: "price_123",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      metadata: {},
    };

    const stripeClient = {
      checkout: {
        sessions: {
          create: vi.fn().mockRejectedValue(new Error("stripe down")),
        },
      },
      products: {
        update: vi.fn().mockResolvedValue({}),
        retrieve: vi.fn().mockResolvedValue({
          id: "prod_123",
          name: "Demo",
          description: "desc",
          images: [],
        }),
      },
    } as unknown as ReturnType<typeof getStripeClient>;

    getOfferConfigMock.mockReturnValue(offer as ReturnType<typeof getOfferConfig>);
    getStripeClientMock.mockReturnValue(stripeClient);
    resolvePriceForEnvironmentMock.mockResolvedValue({
      id: offer.stripePriceId,
      currency: "usd",
      product: "prod_123",
    } as unknown as Stripe.Price);

    const response = await POST(
      buildRequest({
        offerId: offer.id,
        customer: { email: "buyer@example.com" },
      }),
    );

    expect(response.status).toBe(502);
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toContain("Stripe error: stripe down");
    expect(upsertCheckoutSessionMock).not.toHaveBeenCalled();
  });
});
