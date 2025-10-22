import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  isPayPalConfigured: vi.fn(),
  createPayPalOrder: vi.fn(),
  getOfferConfig: vi.fn(),
  getProductData: vi.fn(),
  markStaleCheckoutSessions: vi.fn(),
  upsertCheckoutSession: vi.fn(),
}))

vi.mock("@/lib/payments/paypal", () => ({
  isPayPalConfigured: mocks.isPayPalConfigured,
  createPayPalOrder: mocks.createPayPalOrder,
}))

vi.mock("@/lib/products/offer-config", () => ({
  getOfferConfig: mocks.getOfferConfig,
}))

vi.mock("@/lib/products/product", () => ({
  getProductData: mocks.getProductData,
}))

vi.mock("@/lib/checkout", () => ({
  markStaleCheckoutSessions: mocks.markStaleCheckoutSessions,
  upsertCheckoutSession: mocks.upsertCheckoutSession,
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

import { POST as createPayPalOrder } from "@/app/api/paypal/create-order/route"

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/paypal/create-order", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

const defaultOffer = {
  id: "demo-offer",
  stripePriceId: "price_demo",
  successUrl: "https://example.com/success",
  cancelUrl: "https://example.com/cancel",
  mode: "payment" as const,
  metadata: {},
  productName: "Demo Product",
}

const defaultProduct = {
  slug: "demo-offer",
  name: "Demo Product",
  pricing: { price: "$99.00" },
  stripe: {
    price_id: "price_demo",
    test_price_id: "price_demo_test",
  },
}

beforeEach(() => {
  vi.clearAllMocks()

  mocks.isPayPalConfigured.mockReturnValue(true)
  mocks.getOfferConfig.mockReturnValue(defaultOffer)
  mocks.getProductData.mockReturnValue(defaultProduct)

  mocks.createPayPalOrder.mockResolvedValue({
    id: "paypal-order-123",
    status: "CREATED",
    links: [{ rel: "approve", href: "https://paypal.example.com/approve", method: "GET" }],
  })

  mocks.markStaleCheckoutSessions.mockResolvedValue(undefined)
  mocks.upsertCheckoutSession.mockResolvedValue("session-row-id")
})

describe("POST /api/paypal/create-order", () => {
  it("creates a PayPal order and stores hosted checkout metadata", async () => {
    const response = await createPayPalOrder(
      buildRequest({
        offerId: "demo-offer",
        quantity: 2,
        affiliateId: "AFF123",
        metadata: { source: "lander" },
        customer: { email: "buyer@example.com", name: "Buyer" },
      }),
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toEqual({
      orderId: "paypal-order-123",
      status: "CREATED",
      links: [{ rel: "approve", href: "https://paypal.example.com/approve", method: "GET" }],
    })

    expect(mocks.createPayPalOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "198.00",
        currency: "USD",
        metadata: expect.objectContaining({
          checkoutSource: "hosted_checkout_paypal",
          affiliateId: "AFF123",
          customerEmail: "buyer@example.com",
        }),
      }),
    )

    const upsertArgs = mocks.upsertCheckoutSession.mock.calls[0][0]
    expect(upsertArgs).toMatchObject({
      stripeSessionId: "paypal_paypal-order-123",
      offerId: "demo-offer",
      source: "paypal",
      metadata: expect.objectContaining({
        checkoutSource: "hosted_checkout_paypal",
        paypalOrderId: "paypal-order-123",
      }),
    })
    expect(upsertArgs.metadata).not.toHaveProperty("orderBumpSelected")
    expect(upsertArgs.metadata).not.toHaveProperty("termsAccepted")
  })

  it("rejects when PayPal is not configured", async () => {
    mocks.isPayPalConfigured.mockReturnValueOnce(false)

    const response = await createPayPalOrder(buildRequest({ offerId: "demo-offer" }))
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: "PayPal is not configured" })
  })

  it("validates required payload fields", async () => {
    const response = await createPayPalOrder(buildRequest({ quantity: 1 }))
    expect(response.status).toBe(400)
    const payload = await response.json()
    expect(payload.error).toContain("Required")
  })
})
