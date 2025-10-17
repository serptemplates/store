import React from "react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"

import { EmbeddedCheckoutView } from "@/components/checkout/EmbeddedCheckoutView"

const mockLoadStripe = vi.fn()

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: (...args: unknown[]) => mockLoadStripe(...args),
}))

vi.mock("@/components/paypal-button", () => ({
  PayPalCheckoutButton: () => <div data-testid="paypal-button" />,
}))

const trackCheckoutErrorMock = vi.fn()

vi.mock("@/lib/analytics/checkout", () => ({
  trackCheckoutError: (...args: unknown[]) => trackCheckoutErrorMock(...args),
  trackCheckoutOrderBumpToggled: vi.fn(),
  trackCheckoutPageViewed: vi.fn(),
  trackCheckoutPaymentMethodSelected: vi.fn(),
  trackCheckoutSessionReady: vi.fn(),
}))

vi.mock("@/lib/payments/stripe-environment", () => ({
  requireStripePublishableKey: () => "pk_test_mock",
}))

vi.mock("next/navigation", () => {
  const params = new URLSearchParams("product=skool-video-downloader")
  return {
    useSearchParams: () => ({
      get: (key: string) => params.get(key),
    }),
    useRouter: () => ({
      push: vi.fn(),
    }),
  }
})

const originalFetch = globalThis.fetch
const originalWindowFetch = window.fetch
const originalWindowOpen = window.open

describe("EmbeddedCheckoutView fallback behaviour", () => {
  beforeEach(() => {
    mockLoadStripe.mockReset()
    mockLoadStripe.mockResolvedValue(null)

    trackCheckoutErrorMock.mockReset()

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString()
      if (url.includes("/api/checkout/products/")) {
        return new Response(
          JSON.stringify({
            slug: "skool-video-downloader",
            name: "Skool Video Downloader",
            price: 27,
            currency: "USD",
            orderBump: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }

      if (url.endsWith("/api/checkout/session")) {
        return new Response(
          JSON.stringify({
            id: "cs_test_123",
            client_secret: "secret_123",
            status: "unpaid",
            mode: "payment",
            url: "https://checkout.stripe.com/c/pay/cs_test_123",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }

      throw new Error(`Unexpected fetch call to ${url}`)
    }) as unknown as typeof fetch

    globalThis.fetch = fetchMock
    window.fetch = fetchMock
    window.open = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    window.fetch = originalWindowFetch
    window.open = originalWindowOpen
    vi.restoreAllMocks()
  })

  it("falls back to hosted Stripe checkout when Stripe JS fails to load", async () => {
    render(<EmbeddedCheckoutView />)

    const fallbackButton = (await screen.findByRole("button", {
      name: /open secure stripe checkout/i,
    })) as HTMLButtonElement

    await waitFor(() => {
      expect(fallbackButton.disabled).toBe(false)
    })

    await waitFor(() => {
      expect(trackCheckoutErrorMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          step: "embedded_checkout_stripe_unavailable",
        }),
      )
    })
  })
})
