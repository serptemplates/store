import { expect, test } from "@playwright/test";

test.describe("Homepage smoke", () => {
  test.use({ viewport: { width: 1280, height: 1600 } });

  test("renders without console errors", async ({ page }) => {
    const consoleMessages: Array<{ type: string; text: string; location?: string }> = [];
    page.on("console", (message) => {
      consoleMessages.push({
        type: message.type(),
        text: message.text(),
        location: message.location()?.url,
      });
    });
    page.on("pageerror", (error) => {
      consoleMessages.push({
        type: "error",
        text: error.message,
        location: undefined,
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "SERP Apps" })).toBeVisible();

    // Filter out known third-party errors (Tawk.to, etc.)
    const blockingConsoleErrors = consoleMessages.filter(({ type, text, location }) => {
      if (type !== "error") return false;

      // Ignore generic 400 errors from third-party services
      if (text === "Failed to load resource: the server responded with a status of 400 ()") {
        console.warn(`Ignoring generic 400 error from: ${location || "unknown source"}`);
        return false;
      }

      // Ignore Vercel Insights errors (staging environment)
      if (location?.includes('/_vercel/insights/') || text.includes('/_vercel/insights/')) {
        return false;
      }

      return true;
    });

    expect(
      blockingConsoleErrors,
      blockingConsoleErrors.length ? `Console errors:\n${blockingConsoleErrors.map(e => e.text).join("\n")}` : undefined
    ).toHaveLength(0);
  });
});
