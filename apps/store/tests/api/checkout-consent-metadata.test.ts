import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  stripeSessionCreate: vi.fn(),
  stripeProductsRetrieve: vi.fn(),
  stripeProductsUpdate: vi.fn(),
  resolvePriceForEnvironment: vi.fn(),
  isUsingTestKeys: vi.fn(),
  markStaleCheckoutSessions: vi.fn(),
  upsertCheckoutSession: vi.fn(),
  getOfferConfig: vi.fn(),
  getProductData: vi.fn(),
  createPayPalOrder: vi.fn(),
  isPayPalConfigured: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkoutRateLimit: {},
  withRateLimit: async (_req: NextRequest, _config: unknown, handler: () => Promise<Response>) => handler(),
}))

vi.mock("@/lib/payments/stripe", () => ({
  getStripeClient: () => ({
    checkout: { sessions: { create: mocks.stripeSessionCreate } },
    products: {
      retrieve: mocks.stripeProductsRetrieve,
      update: mocks.stripeProductsUpdate,
    },
  }),
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

vi.mock("@/lib/products/offer-config", () => ({
  getOfferConfig: mocks.getOfferConfig,
}))

vi.mock("@/lib/products/product", () => ({
  getProductData: mocks.getProductData,
}))

vi.mock("@/lib/payments/paypal", () => ({
  createPayPalOrder: mocks.createPayPalOrder,
  isPayPalConfigured: mocks.isPayPalConfigured,
}))

vi.mock("@/lib/payments/coupons", () => ({
  validateCoupon: vi.fn(async () => ({ valid: false })),
}))

vi.mock("@/lib/logger", () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { POST as createStripeSession } from "@/app/api/checkout/session/route"
import { POST as createPayPalOrder } from "@/app/api/paypal/create-order/route"

function buildStripeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/checkout/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

function buildPayPalRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/paypal/create-order", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()

  mocks.getOfferConfig.mockReturnValue({
    id: "demo-offer",
    stripePriceId: "price_demo",
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    mode: "payment",
    metadata: {},
  })

  mocks.getProductData.mockReturnValue({
    slug: "demo-offer",
    name: "Demo Product",
    pricing: { price: "$47.00" },
    stripe: {
      price_id: "price_demo",
      test_price_id: "price_demo_test",
    },
  })

  mocks.resolvePriceForEnvironment.mockResolvedValue({
    id: "price_demo",
    currency: "usd",
    unit_amount: 4700,
    product: "prod_demo",
  })

  mocks.isUsingTestKeys.mockReturnValue(true)
  mocks.stripeSessionCreate.mockResolvedValue({
    id: "cs_test",
    url: "https://stripe.example.com/session",
    payment_status: "unpaid",
    mode: "payment",
  })

  mocks.markStaleCheckoutSessions.mockResolvedValue(undefined)
  mocks.upsertCheckoutSession.mockResolvedValue("session-row-id")

  mocks.isPayPalConfigured.mockReturnValue(true)
  mocks.createPayPalOrder.mockResolvedValue({
    id: "paypal-order-id",
    status: "CREATED",
    links: [{ rel: "approve", href: "https://paypal.example.com/approve", method: "GET" }],
  })
})

describe("checkout metadata defaults", () => {
  it("applies hosted metadata for Stripe checkout without legacy consent fields", async () => {
    const response = await createStripeSession(
      buildStripeRequest({
        offerId: "demo-offer",
        quantity: 1,
      }),
    )

    expect(response.status).toBe(200)

    const stripePayload = mocks.stripeSessionCreate.mock.calls[0][0]
    expect(stripePayload.metadata).toMatchObject({
      checkoutSource: "hosted_checkout_stripe",
      landerId: "demo-offer",
      offerId: "demo-offer",
      environment: "test",
      stripePriceId: "price_demo",
      stripeProductId: "prod_demo",
    })
    expect(stripePayload.metadata).not.toHaveProperty("termsAccepted")
    expect(stripePayload.metadata).not.toHaveProperty("orderBumpSelected")

    expect(mocks.upsertCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          checkoutSource: "hosted_checkout_stripe",
          stripePriceId: "price_demo",
          stripeProductId: "prod_demo",
        }),
      }),
    )
  })

  it("applies hosted metadata for PayPal checkout without legacy consent fields", async () => {
    const paypalResponse = await createPayPalOrder(
      buildPayPalRequest({
        offerId: "demo-offer",
        quantity: 1,
      }),
    )

    expect(paypalResponse.status).toBe(200)

    expect(mocks.createPayPalOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          checkoutSource: "hosted_checkout_paypal",
        }),
      }),
    )

    const upsertMetadata = mocks.upsertCheckoutSession.mock.calls[0][0]?.metadata as Record<string, string>
    expect(upsertMetadata.checkoutSource).toBe("hosted_checkout_paypal")
    expect(upsertMetadata).not.toHaveProperty("termsAccepted")
    expect(upsertMetadata).not.toHaveProperty("orderBumpSelected")
  })
})
