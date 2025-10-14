import { expect, test } from "@playwright/test";

test.describe("Homepage smoke", () => {
  test.use({ viewport: { width: 1280, height: 1600 } });

  test("renders without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "SERP Apps" })).toBeVisible();

    expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toHaveLength(0);
  });
});
