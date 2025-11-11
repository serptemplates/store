import { test, expect } from "@playwright/test";
import type { Request } from "@playwright/test";
import type { Route } from "next";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://staging-apps.serp.co";
const PRODUCT_SLUG = process.env.STAGING_SMOKE_PRODUCT ?? "beeg-video-downloader";
const STRIPE_HOST = "checkout.stripe.com";
const shouldRun = process.env.RUN_STAGING_SMOKE === "1";
const describeFn = shouldRun ? test.describe : test.describe.skip;

describeFn("staging smoke: product CTA", () => {
  test("opens Stripe Checkout Session", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/${PRODUCT_SLUG}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const productTitle = await page.locator("h1").first();
    await expect(productTitle).toBeVisible();

    // Find the primary CTA button - it may have href="#" for programmatic checkout
    // or a direct checkout link
    const dataTestLocator = page.locator('[data-testid="product-primary-cta"]');
    // Look for primary CTA buttons in hero section that link to Stripe or use programmatic checkout
    const buttonLocator = page.locator('section').first().locator('a[href*="stripe"], a[href="#"]').filter({ 
      hasText: /Get|Buy|Download|Purchase/i 
    });

    const locatorToUse = (await dataTestLocator.count()) > 0 ? dataTestLocator : buttonLocator;

    await expect(locatorToUse.first()).toBeVisible();

    // Ensure element inside view before clicking
    await locatorToUse.first().scrollIntoViewIfNeeded();

    const primaryCta = locatorToUse.first();
    const href = (await primaryCta.getAttribute("href")) ?? "";
    const target = (await primaryCta.getAttribute("target")) ?? "";
    const opensNewTab = target === "_blank";
    const looksLikeStripeLink = href.startsWith("https://" + STRIPE_HOST);

    if (opensNewTab || looksLikeStripeLink) {
      const waitForTab = context.waitForEvent("page");
      await primaryCta.click();
      const checkoutPage = await waitForTab;

      await checkoutPage.waitForLoadState("domcontentloaded");
      const checkoutUrl = checkoutPage.url();
      const parsed = new URL(checkoutUrl);
      expect(parsed.hostname).toBe(STRIPE_HOST);

      await checkoutPage.close();
    } else {
      const checkoutResponsePromise = page
        .waitForResponse(
          (response) =>
            response.request().method() === "GET" &&
            response.url().startsWith(`${BASE_URL}/checkout/`),
          { timeout: 15_000 }
        )
        .catch(() => null);

      const stripeRequestPromise = context
        .waitForEvent("request", {
          predicate: (request: Request) => request.url().startsWith(`https://${STRIPE_HOST}`),
          timeout: 20_000,
        })
        .catch(() => null);

      await primaryCta.click();
      const checkoutResponse = await checkoutResponsePromise;
      expect(checkoutResponse, "internal checkout route should respond").not.toBeNull();

      const status = checkoutResponse?.status() ?? 0;
      expect([302, 303, 307]).toContain(status);

      const locationHeader = checkoutResponse?.headers()["location"];
      expect(locationHeader, "checkout redirect should include Location header").toBeTruthy();

      if (locationHeader) {
        const parsedLocation = new URL(locationHeader);
        expect(parsedLocation.hostname).toBe(STRIPE_HOST);
      }

      const stripeRequest = await stripeRequestPromise;
      expect(stripeRequest, "Stripe Checkout should be requested").not.toBeNull();
    }

    await context.close();
  });
});
