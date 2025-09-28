import { expect, test } from "@playwright/test";

test.describe("Checkout smoke", () => {
  test("loads product page and triggers checkout redirect", async ({ page }) => {
    await page.route("**/api/checkout/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "cs_mock_123",
          url: "https://checkout.test/session",
        }),
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.goto("/linkedin-learning-downloader");
    await page.getByRole("heading", { name: /LinkedIn Learning Downloader/i }).waitFor();

    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: /Buy Now with Card/i }).click();

    const popup = await popupPromise;
    await popup.waitForLoadState();
    expect(popup.url()).toBe("https://checkout.test/session");

    await popup.close();
  });
});
