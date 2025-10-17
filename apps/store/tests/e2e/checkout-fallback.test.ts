import { expect, test } from "@playwright/test"

const CHECKOUT_PATH = "/checkout?product=skool-video-downloader"

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

    const fallbackButton = page.getByRole("button", { name: /open secure stripe checkout/i })
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

    const fallbackButton = page.getByRole("button", { name: /open secure stripe checkout/i })
    await expect(fallbackButton).toBeVisible()
    await expect(fallbackButton).toBeEnabled({ timeout: 15000 })

    await expect(
      page.getByText(/problem loading the embedded checkout/i, { exact: false }),
    ).toBeVisible()
  })
})
