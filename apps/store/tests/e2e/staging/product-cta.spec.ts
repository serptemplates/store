import { test, expect } from "@playwright/test";
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
    const buttonLocator = page.locator('a[href*="stripe"], a[href="#"]').filter({ 
      hasText: /Get|Buy|Download|Purchase/i 
    });

    const locatorToUse = (await dataTestLocator.count()) > 0 ? dataTestLocator : buttonLocator;

    await expect(locatorToUse.first()).toBeVisible();

    // Ensure element inside view before clicking
    await locatorToUse.first().scrollIntoViewIfNeeded();

    // Click the CTA and wait for either a new tab or navigation to checkout
    const href = await locatorToUse.first().getAttribute("href");
    
    if (href && href !== "#") {
      // Direct checkout link - expect new tab
      const waitForTab = context.waitForEvent("page");
      await locatorToUse.first().click();
      const checkoutPage = await waitForTab;

      await checkoutPage.waitForLoadState("domcontentloaded");
      await checkoutPage.waitForTimeout(2000);

      const checkoutUrl = checkoutPage.url();
      const parsed = new URL(checkoutUrl);
      expect(parsed.hostname).toBe(STRIPE_HOST);

      await checkoutPage.close();
    } else {
      // Programmatic checkout - expect same-page redirect
      await locatorToUse.first().click();
      
      // Wait for navigation to Stripe checkout
      await page.waitForURL((url) => url.hostname === STRIPE_HOST, {
        timeout: 10000,
      });

      const checkoutUrl = page.url();
      const parsed = new URL(checkoutUrl);
      expect(parsed.hostname).toBe(STRIPE_HOST);
    }

    await context.close();
  });
});
