import { expect, test } from "@playwright/test"

const baseCheckoutPath = "/checkout?product=skool-video-downloader"
const checkoutMode = process.env.NEXT_PUBLIC_CHECKOUT_UI?.toLowerCase()
const CHECKOUT_PATH =
  checkoutMode === "hosted" ? `${baseCheckoutPath}&ui=embedded` : baseCheckoutPath

function getFallbackButton(page: import("@playwright/test").Page) {
  return page.getByRole("button", { name: /open (secure stripe|embedded) checkout/i })
}

const TRACKER_BLOCKLIST = [
  "**/*tawk.to/**",
  "**/*intercom*",
  "**/*crisp.chat*",
  "**/*hotjar*",
  "**/*clarity.ms*",
  "**/*segment.io*",
]

async function disableAnimations(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const css = `
      * { animation: none !important; transition: none !important; }
      html { scroll-behavior: auto !important; }
    `
    const style = document.createElement("style")
    style.setAttribute("data-e2e", "disable-animations")
    style.textContent = css
    document.documentElement.appendChild(style)
  })
  await page.emulateMedia({ reducedMotion: "reduce" })
}

test.describe("Embedded checkout fallback", () => {
  test.beforeEach(async ({ page }) => {
    for (const pattern of TRACKER_BLOCKLIST) {
      await page.route(pattern, (route) => route.abort())
    }
    await page.addInitScript(() => {
      const originalAddEventListener = window.addEventListener.bind(window)
      Object.defineProperty(window, "__stripeMessageListenerRegistered", {
        configurable: true,
        writable: true,
        value: false,
      })
      window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
        originalAddEventListener(type, listener, options)
        if (type === "message") {
          ;(window as unknown as { __stripeMessageListenerRegistered: boolean }).__stripeMessageListenerRegistered = true
        }
      }) as typeof window.addEventListener
    })
    await disableAnimations(page)
  })

  test("shows hosted fallback when Stripe JS is blocked", async ({ page }) => {
    await page.route("**/js.stripe.com/**", (route) => route.abort())

    await page.goto(CHECKOUT_PATH, { waitUntil: "domcontentloaded" })

    const fallbackButton = getFallbackButton(page)
    await expect(fallbackButton).toBeVisible()
    await expect(fallbackButton).toBeEnabled({ timeout: 15000 })

    await expect(
      page.getByText(/couldn't load the embedded checkout/i, { exact: false }),
    ).toBeVisible()
  })

  test("switches to fallback when embedded iframe reports an error", async ({ page }) => {
    await page.route("**/elements-inner-express-checkout**", (route) =>
      route.fulfill({
        status: 204,
      }),
    )

    await page.goto(CHECKOUT_PATH, { waitUntil: "domcontentloaded" })

    await page.waitForFunction(() => (window as unknown as { __stripeMessageListenerRegistered?: boolean }).__stripeMessageListenerRegistered === true)

    await page.evaluate(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "checkout.error", payload: { event: "checkout.error" } },
          origin: "https://js.stripe.com",
        }),
      )
    })

    const fallbackButton = getFallbackButton(page)
    await expect(fallbackButton).toBeVisible()
    await expect(fallbackButton).toBeEnabled({ timeout: 15000 })

    await expect(
      page.getByText(/problem loading the embedded checkout/i, { exact: false }),
    ).toBeVisible()
  })

  test("switches to fallback when the checkout session responds with non-json content", async ({ page }) => {
    await page.route("**/api/checkout/session", async (route, request) => {
      let body: Record<string, unknown> = {}
      try {
        body = (request.postDataJSON() ?? {}) as Record<string, unknown>
      } catch {
        body = {}
      }

      if (body.uiMode === "embedded") {
        await route.fulfill({
          status: 502,
          contentType: "text/html",
          body: "<!DOCTYPE html><html><body>502</body></html>",
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "cs_hosted_123",
          url: "https://checkout.stripe.com/c/pay/cs_hosted_123",
        }),
      })
    })

    await page.goto(CHECKOUT_PATH, { waitUntil: "domcontentloaded" })

    const fallbackButton = getFallbackButton(page)
    await expect(fallbackButton).toBeVisible()
    await expect(fallbackButton).toBeEnabled({ timeout: 15000 })

    await expect(page.getByTestId("checkout-fallback-message")).toHaveText(
      /couldn't create the embedded checkout session/i,
    )
  })
})
