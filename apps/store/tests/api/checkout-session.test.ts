import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createStripeSession: vi.fn(),
  retrieveProduct: vi.fn(),
  updateProduct: vi.fn(),
  resolvePriceForEnvironment: vi.fn(),
  getStripeClient: vi.fn(),
  isUsingTestKeys: vi.fn(),
  markStaleCheckoutSessions: vi.fn(),
  upsertCheckoutSession: vi.fn(),
  createSimpleCheckout: vi.fn(),
  getOfferConfig: vi.fn(),
  getProductData: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkoutRateLimit: {},
  withRateLimit: async (_req: NextRequest, _config: unknown, handler: () => Promise<Response>) => handler(),
}))

vi.mock("@/lib/payments/stripe", () => ({
  getStripeClient: mocks.getStripeClient,
  resolvePriceForEnvironment: mocks.resolvePriceForEnvironment,
  isUsingTestKeys: mocks.isUsingTestKeys,
}))

vi.mock("@/lib/payments/stripe-environment", () => ({
  getOptionalStripePaymentConfigId: () => undefined,
}))

vi.mock("@/lib/checkout", () => ({
  markStaleCheckoutSessions: mocks.markStaleCheckoutSessions,
  upsertCheckoutSession: mocks.upsertCheckoutSession,
}))

vi.mock("@/lib/checkout/simple-checkout", () => ({
  createSimpleCheckout: mocks.createSimpleCheckout,
}))

vi.mock("@/lib/products/offer-config", () => ({
  getOfferConfig: mocks.getOfferConfig,
}))

vi.mock("@/lib/products/product", () => ({
  getProductData: mocks.getProductData,
}))

vi.mock("@/lib/logger", () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

import { POST as createCheckoutSession } from "@/app/api/checkout/session/route"

const defaultOffer = {
  id: "demo-offer",
  mode: "payment" as const,
  stripePriceId: "price_demo",
  productName: "Demo Product",
  productDescription: "Test description",
  productImage: "https://example.com/product.png",
  successUrl: "https://example.com/success",
  cancelUrl: "https://example.com/cancel",
  metadata: {
    landerId: "demo-lander",
  },
}

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/checkout/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()

  mocks.getOfferConfig.mockReturnValue(defaultOffer)
  mocks.getProductData.mockReturnValue({
    slug: "demo-offer",
    name: "Demo Product",
    pricing: { price: "$99.00" },
    stripe: {
      price_id: "price_demo",
      test_price_id: "price_demo_test",
    },
  })

  mocks.resolvePriceForEnvironment.mockResolvedValue({
    id: "price_demo",
    currency: "usd",
    unit_amount: 9900,
    product: "prod_demo",
  })

  mocks.getStripeClient.mockReturnValue({
    checkout: { sessions: { create: mocks.createStripeSession } },
    products: { retrieve: mocks.retrieveProduct, update: mocks.updateProduct },
  })

  mocks.createStripeSession.mockResolvedValue({
    id: "cs_test",
    url: "https://stripe.example.com/cs_test",
    payment_status: "unpaid",
    mode: "payment",
  })

  mocks.markStaleCheckoutSessions.mockResolvedValue(undefined)
  mocks.upsertCheckoutSession.mockResolvedValue("session-row-id")
  mocks.isUsingTestKeys.mockReturnValue(true)
  mocks.createSimpleCheckout.mockResolvedValue({
    id: "cs_simple",
    url: "https://stripe.example.com/cs_simple",
  })
})

describe("POST /api/checkout/session", () => {
  it("creates a hosted Stripe checkout session with default metadata", async () => {
    const response = await createCheckoutSession(
      buildRequest({
        offerId: defaultOffer.id,
        quantity: 1,
        customer: {
          email: "buyer@example.com",
        },
        metadata: {
          landerId: "custom-lander",
        },
      }),
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toEqual({
      id: "cs_test",
      url: "https://stripe.example.com/cs_test",
      status: "unpaid",
      mode: "payment",
    })

    expect(mocks.createStripeSession).toHaveBeenCalledTimes(1)
    const sessionPayload = mocks.createStripeSession.mock.calls[0][0]
    expect(sessionPayload.success_url).toBe(defaultOffer.successUrl)
    expect(sessionPayload.cancel_url).toBe(defaultOffer.cancelUrl)
    expect(sessionPayload.line_items).toEqual([
      { price: defaultOffer.stripePriceId, quantity: 1 },
    ])

    expect(sessionPayload.metadata).toMatchObject({
      checkoutSource: "hosted_checkout_stripe",
      landerId: "custom-lander",
      offerId: defaultOffer.id,
      environment: "test",
      stripePriceId: defaultOffer.stripePriceId,
      stripeProductId: "prod_demo",
    })

    expect(mocks.upsertCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeSessionId: "cs_test",
        offerId: defaultOffer.id,
        customerEmail: "buyer@example.com",
        metadata: expect.objectContaining({
          checkoutSource: "hosted_checkout_stripe",
          stripePriceId: defaultOffer.stripePriceId,
          stripeProductId: "prod_demo",
        }),
      }),
    )
  })

  it("returns 404 when the offer configuration cannot be found", async () => {
    mocks.getOfferConfig.mockReturnValueOnce(undefined)
    mocks.getProductData.mockImplementationOnce(() => {
      throw new Error("not found")
    })

    const response = await createCheckoutSession(
      buildRequest({
        offerId: "missing-offer",
        quantity: 1,
      }),
    )

    expect(response.status).toBe(404)
    const payload = await response.json()
    expect(payload.error).toContain("missing-offer")
    expect(mocks.createStripeSession).not.toHaveBeenCalled()
  })

  it("includes product GHL tags in checkout metadata", async () => {
    mocks.getProductData.mockReturnValueOnce({
      slug: "demo-offer",
      name: "Demo Product",
      pricing: { price: "$99.00" },
      stripe: {
        price_id: "price_demo",
        test_price_id: "price_demo_test",
      },
      ghl: {
        tag_ids: ["early-access", "purchased-demo"],
      },
    })

    const response = await createCheckoutSession(
      buildRequest({
        offerId: defaultOffer.id,
        quantity: 1,
      }),
    )

    expect(response.status).toBe(200)
    const sessionPayload = mocks.createStripeSession.mock.calls[0][0]
    expect(sessionPayload.metadata).toMatchObject({
      ghlTagIds: "early-access,purchased-demo",
    })

    const persistedMetadata = mocks.upsertCheckoutSession.mock.calls[0][0]?.metadata as Record<string, string>
    expect(persistedMetadata.ghlTagIds).toBe("early-access,purchased-demo")
  })

  it("falls back to simple checkout when offer config is absent but product exists", async () => {
    mocks.getOfferConfig.mockReturnValueOnce(undefined)

    const response = await createCheckoutSession(
      buildRequest({
        offerId: defaultOffer.id,
        quantity: 2,
        metadata: {
          landerId: "demo-offer",
        },
      }),
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toEqual({
      id: "cs_simple",
      url: "https://stripe.example.com/cs_simple",
    })

    expect(mocks.createSimpleCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        offerId: defaultOffer.id,
        quantity: 2,
        metadata: expect.objectContaining({
          checkoutSource: "hosted_checkout_stripe",
        }),
      }),
    )
    expect(mocks.upsertCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeSessionId: "cs_simple",
      }),
    )
  })
})
