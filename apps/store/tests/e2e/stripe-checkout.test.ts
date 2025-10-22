import { expect, test } from "@playwright/test"

test.use({ viewport: { width: 1280, height: 1600 } })

test.describe("Hosted Stripe checkout flow", () => {
  test("product CTA posts metadata and navigates without PayPal", async ({ page, context }) => {
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

    const sessionUrl = "/mock-stripe-checkout?session_id=cs_test_playwright"
    const escapedSessionUrlPattern = new RegExp(sessionUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))

    await page.route("**/api/checkout/session", async (route, request) => {
      const json = request.postDataJSON() as Record<string, unknown>
      interceptedBodies.push(json)

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "cs_test_playwright",
          url: sessionUrl,
          status: "open",
          mode: "payment",
        }),
      })
    })

    await page.goto("/rawpixel-downloader", { waitUntil: "domcontentloaded" })

    await expect(page.locator("text=/PayPal/i")).toHaveCount(0)

    const navigationPromise = page.waitForURL(escapedSessionUrlPattern, {
      waitUntil: "domcontentloaded",
    })

    const primaryCtaButton = page.getByRole("button", { name: /get it now/i }).first()
    await expect(primaryCtaButton).toBeVisible()
    await primaryCtaButton.click()

    await navigationPromise

    expect(interceptedBodies.length).toBe(1)
    const requestBody = interceptedBodies[0]

    expect(requestBody).toMatchObject({
      offerId: "rawpixel-downloader",
      quantity: 1,
      metadata: {
        checkoutSource: "hosted_checkout_stripe",
        landerId: "rawpixel-downloader",
      },
    })

    await expect(page.url()).toMatch(escapedSessionUrlPattern)

    // Reset to avoid bleeding state if other tests run in same worker
    await context.clearCookies()
  })
})
