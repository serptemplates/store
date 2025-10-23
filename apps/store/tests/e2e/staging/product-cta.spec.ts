import { test, expect } from "@playwright/test";
import type { Route } from "next";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://staging-apps.serp.co";
const PRODUCT_SLUG = process.env.STAGING_SMOKE_PRODUCT ?? "beeg-video-downloader";
const STRIPE_HOST = "buy.stripe.com";
const shouldRun = process.env.RUN_STAGING_SMOKE === "1";
const describeFn = shouldRun ? test.describe : test.describe.skip;

describeFn("staging smoke: product CTA", () => {
  test("opens Stripe Payment Link", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/${PRODUCT_SLUG}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const productTitle = await page.locator("h1").first();
    await expect(productTitle).toBeVisible();

    const dataTestLocator = page.locator('[data-testid="product-primary-cta"]');
    const fallbackLocator = page.locator("a[href^='https://buy.stripe.com']");

    const locatorToUse = (await dataTestLocator.count()) > 0 ? dataTestLocator : fallbackLocator;

    await expect(locatorToUse.first()).toBeVisible();

    const href = await locatorToUse.first().getAttribute("href");
    expect(href, "CTA href should be defined").toBeTruthy();

    // Ensure element inside view before clicking
    await locatorToUse.first().scrollIntoViewIfNeeded();

    const waitForTab = context.waitForEvent("page");
    await locatorToUse.first().evaluate((element) => {
      (element as HTMLElement).click();
    });
    const checkoutPage = await waitForTab;

    await checkoutPage.waitForLoadState("domcontentloaded");
    await checkoutPage.waitForTimeout(2000);

    const checkoutUrl = checkoutPage.url();
    const parsed = new URL(checkoutUrl);
    expect(parsed.hostname).toBe(STRIPE_HOST);

    await checkoutPage.close();
    await context.close();
  });
});
