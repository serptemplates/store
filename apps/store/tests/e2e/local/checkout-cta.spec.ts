import { expect, test } from "@playwright/test";

const slug = "onlyfans-downloader";

test.describe("Checkout CTA flow", () => {
  test.use({ viewport: { width: 1280, height: 1200 } });

  test("primary CTA hits internal checkout route before redirecting to Stripe", async ({ page }) => {
    await page.goto(`/${slug}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const requestPromise = page.waitForRequest(
      (req) => req.method() === "GET" && req.url().includes(`/checkout/${slug}`)
    );
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes(`/checkout/${slug}`) && res.status() === 302
    );
    const navigationPromise = page.waitForNavigation({
      url: /https:\/\/(?:checkout|buy)\.stripe\.com\//,
      waitUntil: "domcontentloaded",
    });

    await page.getByTestId("product-primary-cta").click();

    const request = await requestPromise;
    const response = await responsePromise;
    await navigationPromise;

    const requestedUrl = new URL(request.url());
    expect(request.method()).toBe("GET");
    expect(requestedUrl.pathname).toBe(`/checkout/${slug}`);

    const location = response.headers()["location"];
    expect(location, "checkout redirect should point to Stripe").toMatch(
      /^https:\/\/(?:checkout|buy)\.stripe\.com\//
    );

    expect(page.url()).toMatch(/^https:\/\/(?:checkout|buy)\.stripe\.com\//);
  });
});
