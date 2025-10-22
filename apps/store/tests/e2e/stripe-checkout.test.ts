import { expect, test } from "@playwright/test"

test.use({ viewport: { width: 1280, height: 1600 } })

test.describe("Hosted Stripe checkout flow", () => {
  test("confirm screen posts metadata and navigates without PayPal", async ({ page, context }) => {
    const ignoredRequestPatterns = [
      /tawk\.to/i,
      /googletagmanager/i,
      /google-analytics/i,
      /clarity\.ms/i,
      /hotjar/i,
      /intercom/i,
    ]

    await page.route("**/*", async (route, request) => {
      if (request.failure() || request.resourceType() === "document") {
        return route.continue()
      }
      if (ignoredRequestPatterns.some((pattern) => pattern.test(request.url()))) {
        return route.abort()
      }
      return route.continue()
    })

    const interceptedBodies: Array<Record<string, unknown>> = []

    await page.route("**/api/checkout/session", async (route, request) => {
      const json = request.postDataJSON() as Record<string, unknown>
      interceptedBodies.push(json)

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "cs_test_playwright",
          url: "/mock-stripe-checkout?session_id=cs_test_playwright",
          status: "open",
          mode: "payment",
        }),
      })
    })

    await page.goto("/checkout?product=rawpixel-downloader", { waitUntil: "domcontentloaded" })

    await expect(page.getByRole("heading", { name: /Continue to Stripe Checkout/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Continue to Stripe Checkout/i })).toBeVisible()

    const paypalMentions = page.locator("text=/paypal/i")
    await expect(paypalMentions).toHaveCount(0)

    const navigationPromise = page.waitForURL(/\/mock-stripe-checkout\?session_id=cs_test_playwright/, {
      waitUntil: "domcontentloaded",
    })

    await page.getByRole("button", { name: /Continue to Stripe Checkout/i }).click()

    await navigationPromise

    expect(interceptedBodies.length).toBe(1)
    const requestBody = interceptedBodies[0]

    expect(requestBody).toMatchObject({
      offerId: "rawpixel-downloader",
      quantity: 1,
      metadata: {
        landerId: "rawpixel-downloader",
        checkoutSource: "hosted_checkout_stripe",
      },
    })

    await expect(page.url()).toContain("/mock-stripe-checkout?session_id=cs_test_playwright")

    // Reset to avoid bleeding state if other tests run in same worker
    await context.clearCookies()
  })
})
