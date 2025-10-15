import { NextRequest } from "next/server"
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  stripeCheckoutCreate: vi.fn(),
  stripeProductsRetrieve: vi.fn(),
  stripeProductsUpdate: vi.fn(),
  resolvePriceForEnvironment: vi.fn(),
  isUsingTestKeys: vi.fn(),
  markStaleCheckoutSessions: vi.fn(),
  upsertCheckoutSession: vi.fn(),
  createPayPalOrder: vi.fn(),
  isPayPalConfigured: vi.fn(),
  getOfferConfig: vi.fn(),
  getProductData: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkoutRateLimit: {},
  withRateLimit: async (_request: NextRequest, _config: unknown, handler: () => Promise<Response>) => handler(),
}))

vi.mock("@/lib/payments/stripe", () => ({
  getStripeClient: () => ({
    checkout: { sessions: { create: mocks.stripeCheckoutCreate } },
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

vi.mock("@/lib/payments/coupons", () => ({
  validateCoupon: vi.fn(async () => ({ valid: false })),
}))

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/lib/payments/paypal", () => ({
  createPayPalOrder: mocks.createPayPalOrder,
  isPayPalConfigured: mocks.isPayPalConfigured,
}))

vi.mock("@/lib/products/product", () => ({
  getProductData: mocks.getProductData,
}))

import { POST as createStripeEmbeddedCheckout } from "@/app/api/checkout/session/route"
import { POST as createPayPalOrderEndpoint } from "@/app/api/paypal/create-order/route"

const TEST_TIME = new Date("2024-05-01T12:00:00.000Z")

function buildRequest(url: string, body: Record<string, unknown>, extraHeaders?: Record<string, string>) {
  const headers = new Headers({
    "content-type": "application/json",
    "x-forwarded-for": "203.0.113.10, 198.51.100.42",
    "user-agent": "SERPTestAgent/1.0 (Checkout)",
    ...extraHeaders,
  })

  const underlyingRequest = new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  return new NextRequest(underlyingRequest)
}

beforeEach(() => {
  vi.useFakeTimers().setSystemTime(TEST_TIME)

  mocks.stripeCheckoutCreate.mockReset()
  mocks.stripeProductsRetrieve.mockReset()
  mocks.stripeProductsUpdate.mockReset()
  mocks.resolvePriceForEnvironment.mockReset()
  mocks.isUsingTestKeys.mockReset()
  mocks.markStaleCheckoutSessions.mockReset()
  mocks.upsertCheckoutSession.mockReset()
  mocks.createPayPalOrder.mockReset()
  mocks.isPayPalConfigured.mockReset()
  mocks.getOfferConfig.mockReset()
  mocks.getProductData.mockReset()

  mocks.resolvePriceForEnvironment.mockResolvedValue({
    id: "price_123",
    unit_amount: 6700,
    product: null,
  })
  mocks.isUsingTestKeys.mockReturnValue(true)

  mocks.getOfferConfig.mockReturnValue({
    id: "tiktok-downloader",
    stripePriceId: "price_123",
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    mode: "payment",
    metadata: {},
    productName: "TikTok Downloader",
  })

  mocks.stripeCheckoutCreate.mockResolvedValue({
    id: "cs_test_123",
    client_secret: "secret_123",
    payment_intent: "pi_test_123",
    payment_status: "unpaid",
    mode: "payment",
  })

  mocks.upsertCheckoutSession.mockResolvedValue("session-row-id")
  mocks.markStaleCheckoutSessions.mockResolvedValue(undefined)

  mocks.isPayPalConfigured.mockReturnValue(true)

  mocks.createPayPalOrder.mockResolvedValue({
    id: "order_123",
    status: "CREATED",
    links: [
      { rel: "approve", href: "https://paypal.example.com/approve", method: "GET" },
    ],
  })

  mocks.getProductData.mockReturnValue({
    name: "TikTok Downloader",
    pricing: { price: "$67.00" },
  })
})

afterAll(() => {
  vi.useRealTimers()
})

describe("checkout consent metadata", () => {
  it("persists consent evidence for embedded Stripe checkout", async () => {
    const requestBody = {
      offerId: "tiktok-downloader",
      quantity: 1,
      uiMode: "embedded" as const,
      metadata: {
        landerId: "tiktok-downloader",
        checkoutSource: "custom_checkout_stripe",
        termsAccepted: "true",
        termsAcceptedAt: "2024-04-30T09:15:00.000Z",
      },
    }

    const response = await createStripeEmbeddedCheckout(
      buildRequest("http://localhost/api/checkout/session", requestBody)
    )

    const payload = await response.json()
    expect(response.status, JSON.stringify(payload)).toBe(200)
    expect(payload.client_secret).toBe("secret_123")

    expect(mocks.stripeCheckoutCreate).toHaveBeenCalledTimes(1)
    const stripeParams = mocks.stripeCheckoutCreate.mock.calls[0][0]
    const metadata = stripeParams.metadata as Record<string, string>

    expect(metadata.checkoutSource).toBe("custom_checkout_stripe")
    expect(metadata.termsAccepted).toBe("true")
    expect(metadata.termsAcceptedAtClient).toBe("2024-04-30T09:15:00.000Z")
    expect(metadata.termsAcceptedAt).toBe(TEST_TIME.toISOString())
    expect(metadata.termsAcceptedIp).toBe("203.0.113.10")
    expect(metadata.termsAcceptedUserAgent).toBe("SERPTestAgent/1.0 (Checkout)")

    expect(mocks.upsertCheckoutSession).toHaveBeenCalledTimes(1)
    const dbMetadata = mocks.upsertCheckoutSession.mock.calls[0][0]?.metadata as Record<string, string>
    expect(dbMetadata).toMatchObject({
      checkoutSource: "custom_checkout_stripe",
      termsAccepted: "true",
      termsAcceptedAt: TEST_TIME.toISOString(),
      termsAcceptedAtClient: "2024-04-30T09:15:00.000Z",
      termsAcceptedIp: "203.0.113.10",
      termsAcceptedUserAgent: "SERPTestAgent/1.0 (Checkout)",
    })
  })

  it("adds order bump metadata and line item when selected", async () => {
    mocks.getProductData.mockReturnValueOnce({
      name: "TikTok Downloader",
      pricing: { price: "$67.00" },
      order_bump: {
        id: "priority-support",
        title: "Priority Support",
        price: "$29.00",
        stripe: {
          price_id: "price_bump_live",
          test_price_id: "price_bump_test",
        },
      },
    })

    mocks.resolvePriceForEnvironment
      .mockResolvedValueOnce({
        id: "price_base_test",
        unit_amount: 6700,
        product: null,
      })
      .mockResolvedValueOnce({
        id: "price_bump_test",
        unit_amount: 2900,
        product: null,
      })

    const requestBody = {
      offerId: "tiktok-downloader",
      quantity: 1,
      uiMode: "embedded" as const,
      orderBump: {
        id: "priority-support",
        selected: true,
      },
      metadata: {
        landerId: "tiktok-downloader",
        checkoutSource: "custom_checkout_stripe",
        termsAccepted: "true",
        termsAcceptedAt: "2024-04-30T09:15:00.000Z",
      },
    }

    const response = await createStripeEmbeddedCheckout(
      buildRequest("http://localhost/api/checkout/session", requestBody)
    )

    const payload = await response.json()
    expect(response.status, JSON.stringify(payload)).toBe(200)

    expect(mocks.stripeCheckoutCreate).toHaveBeenCalledTimes(1)
    const stripeParams = mocks.stripeCheckoutCreate.mock.calls[0][0]

    expect(stripeParams.line_items).toHaveLength(2)
    expect(stripeParams.line_items[0]).toMatchObject({ price: "price_base_test", quantity: 1 })
    expect(stripeParams.line_items[1]).toMatchObject({ price: "price_bump_test", quantity: 1 })

    const metadata = stripeParams.metadata as Record<string, string>
    expect(metadata.orderBumpSelected).toBe("true")
    expect(metadata.orderBumpTitle).toBe("Priority Support")
    expect(metadata.orderBumpUnitCents).toBe("2900")
    expect(metadata.checkoutTotalWithOrderBumpCents).toBe(String(6700 + 2900))

    expect(mocks.upsertCheckoutSession).toHaveBeenCalledTimes(1)
    const storedMetadata = mocks.upsertCheckoutSession.mock.calls[0][0]?.metadata as Record<string, string>
    expect(storedMetadata.orderBumpSelected).toBe("true")
    expect(storedMetadata.orderBumpUnitCents).toBe("2900")
    expect(storedMetadata.checkoutTotalWithOrderBumpCents).toBe(String(6700 + 2900))
  })

  it("persists consent evidence for PayPal checkout", async () => {
    const requestBody = {
      offerId: "tiktok-downloader",
      quantity: 1,
      metadata: {
        landerId: "tiktok-downloader",
        termsAccepted: "true",
        termsAcceptedAt: "2024-04-29T08:00:00.000Z",
      },
    }

    const response = await createPayPalOrderEndpoint(
      buildRequest("http://localhost/api/paypal/create-order", requestBody)
    )

    const payload = await response.json()
    expect(response.status, JSON.stringify(payload)).toBe(200)
    expect(payload.orderId).toBe("order_123")

    expect(mocks.createPayPalOrder).toHaveBeenCalledTimes(1)
    const paypalMetadata = mocks.createPayPalOrder.mock.calls[0][0]?.metadata as Record<string, string>
    expect(paypalMetadata).toMatchObject({
      checkoutSource: "custom_checkout_paypal",
      termsAccepted: "true",
      termsAcceptedAt: TEST_TIME.toISOString(),
      termsAcceptedAtClient: "2024-04-29T08:00:00.000Z",
      termsAcceptedIp: "203.0.113.10",
      termsAcceptedUserAgent: "SERPTestAgent/1.0 (Checkout)",
    })

    expect(mocks.upsertCheckoutSession).toHaveBeenCalledTimes(1)
    const storedMetadata = mocks.upsertCheckoutSession.mock.calls[0][0]?.metadata as Record<string, string>
    expect(storedMetadata).toMatchObject({
      checkoutSource: "custom_checkout_paypal",
      termsAccepted: "true",
      termsAcceptedAt: TEST_TIME.toISOString(),
      termsAcceptedAtClient: "2024-04-29T08:00:00.000Z",
      termsAcceptedIp: "203.0.113.10",
      termsAcceptedUserAgent: "SERPTestAgent/1.0 (Checkout)",
    })
  })

  it("calculates PayPal totals with order bump selection", async () => {
    mocks.getProductData.mockReturnValueOnce({
      name: "TikTok Downloader",
      pricing: { price: "$67.00" },
      order_bump: {
        id: "priority-support",
        title: "Priority Support",
        price: "$29.00",
      },
    })

    const requestBody = {
      offerId: "tiktok-downloader",
      quantity: 1,
      orderBump: {
        id: "priority-support",
        selected: true,
      },
      metadata: {
        landerId: "tiktok-downloader",
        checkoutSource: "custom_checkout_paypal",
        termsAccepted: "true",
        termsAcceptedAt: "2024-04-30T09:15:00.000Z",
      },
    }

    const response = await createPayPalOrderEndpoint(
      buildRequest("http://localhost/api/paypal/create-order", requestBody)
    )

    const payload = await response.json()
    expect(response.status, JSON.stringify(payload)).toBe(200)

    expect(mocks.createPayPalOrder).toHaveBeenCalledTimes(1)
    const paypalArgs = mocks.createPayPalOrder.mock.calls[0][0]
    expect(paypalArgs.amount).toBe("96.00")

    const metadata = paypalArgs.metadata as Record<string, string>
    expect(metadata.orderBumpSelected).toBe("true")
    expect(metadata.orderBumpUnitCents).toBe("2900")
    expect(metadata.checkoutTotalCents).toBe(String(9600))

    expect(mocks.upsertCheckoutSession).toHaveBeenCalledTimes(1)
    const storedMetadata = mocks.upsertCheckoutSession.mock.calls[0][0]?.metadata as Record<string, string>
    expect(storedMetadata.orderBumpSelected).toBe("true")
    expect(storedMetadata.checkoutTotalCents).toBe(String(9600))
  })
})
