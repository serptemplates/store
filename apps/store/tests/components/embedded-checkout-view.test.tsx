import React from "react"
import { describe, expect, it, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"

const mockLoadStripe = vi.fn()

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: (...args: unknown[]) => mockLoadStripe(...args),
}))

vi.mock("@stripe/react-stripe-js", () => ({
  EmbeddedCheckoutProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="embedded-checkout-provider">{children}</div>,
  EmbeddedCheckout: () => <div data-testid="embedded-checkout" />,
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

const originalGlobalFetch = globalThis.fetch
const originalWindowFetch = typeof window !== "undefined" ? window.fetch : undefined
const originalWindowOpen = typeof window !== "undefined" ? window.open : undefined
let openSpy: ReturnType<typeof vi.spyOn<typeof window, "open">> | undefined

const fetchCalls: string[] = []

const defaultFetchImplementation = async (input: RequestInfo | URL, init?: RequestInit) => {
  let url: string
  if (typeof input === "string") {
    url = input
  } else if (input instanceof URL) {
    url = input.toString()
  } else if (typeof (input as { url?: string }).url === "string") {
    url = (input as { url: string }).url
  } else {
    url = String(input)
  }

  if (url.includes("/api/checkout/products/")) {
    fetchCalls.push(url)
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
    fetchCalls.push(url)
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

  fetchCalls.push(url)
  return originalGlobalFetch(input, init)
}

const fetchMockImpl = vi.fn(defaultFetchImplementation)

globalThis.fetch = fetchMockImpl as typeof fetch
if (typeof window !== "undefined") {
  window.fetch = fetchMockImpl as typeof fetch
}

let EmbeddedCheckoutView: (typeof import("@/components/checkout/EmbeddedCheckoutView"))["EmbeddedCheckoutView"]

beforeAll(async () => {
  ;({ EmbeddedCheckoutView } = await import("@/components/checkout/EmbeddedCheckoutView"))
})

afterAll(() => {
  openSpy?.mockRestore()
  if (originalWindowFetch) {
    window.fetch = originalWindowFetch
  }
  globalThis.fetch = originalGlobalFetch
  if (originalWindowOpen) {
    window.open = originalWindowOpen
  }
  fetchMockImpl.mockReset()
})

describe("EmbeddedCheckoutView fallback behaviour", () => {
  beforeEach(() => {
    mockLoadStripe.mockReset()

    trackCheckoutErrorMock.mockReset()
    fetchMockImpl.mockImplementation(defaultFetchImplementation)
    fetchMockImpl.mockClear()
    fetchCalls.length = 0

    if (typeof window !== "undefined") {
      openSpy = vi.spyOn(window, "open").mockImplementation(() => null)
    }
  })

  afterEach(() => {
    openSpy?.mockRestore()
    openSpy = undefined
    mockLoadStripe.mockReset()
    trackCheckoutErrorMock.mockReset()
  })

  it("falls back to hosted Stripe checkout when Stripe JS fails to load", async () => {
    mockLoadStripe.mockResolvedValueOnce(null)

    render(<EmbeddedCheckoutView />)

    await waitFor(() => {
      expect(fetchCalls.some((url) => url.includes("/api/checkout/products/"))).toBe(true)
    })

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

  it("switches to fallback when the embedded iframe reports an error", async () => {
    mockLoadStripe.mockResolvedValue({ id: "mock-stripe" })

    render(<EmbeddedCheckoutView />)

    await waitFor(() => {
      expect(fetchCalls.some((url) => url.includes("/api/checkout/products/"))).toBe(true)
    })

    await screen.findByTestId("embedded-checkout")

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "checkout.error", payload: { event: "checkout.error" } },
          origin: "https://js.stripe.com",
        }),
      )
    })

    const fallbackButton = (await screen.findByRole("button", {
      name: /open secure stripe checkout/i,
    })) as HTMLButtonElement

    expect(fallbackButton.disabled).toBe(false)

    await waitFor(() => {
      expect(trackCheckoutErrorMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          step: "embedded_checkout_iframe_error",
        }),
      )
    })
  })

  it("falls back when the checkout session returns non-json content", async () => {
    mockLoadStripe.mockResolvedValue({ id: "mock-stripe" })

    fetchMockImpl.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      let url: string
      if (typeof input === "string") {
        url = input
      } else if (input instanceof URL) {
        url = input.toString()
      } else if (typeof (input as { url?: string }).url === "string") {
        url = (input as { url: string }).url
      } else {
        url = String(input)
      }

      if (url.endsWith("/api/checkout/session")) {
        fetchCalls.push(url)
        let bodyPayload: Record<string, unknown> = {}
        if (init?.body && typeof init.body === "string") {
          try {
            bodyPayload = JSON.parse(init.body)
          } catch {
            bodyPayload = {}
          }
        }

        if (bodyPayload.uiMode === "embedded") {
          return new Response("<!DOCTYPE html><html><body>502</body></html>", {
            status: 502,
            headers: { "Content-Type": "text/html" },
          })
        }

        return new Response(
          JSON.stringify({
            id: "cs_hosted_123",
            url: "https://checkout.stripe.com/c/pay/cs_hosted_123",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }

      return defaultFetchImplementation(input, init)
    })

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
          step: "embedded_checkout_session_error",
        }),
      )
    })
  })

})
