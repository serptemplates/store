import { expect, test } from "@playwright/test";

test.describe("videos library", () => {
  test("loads without console or network errors", async ({ page }) => {
    const consoleMessages: Array<{ type: string; text: string; location?: string }> = [];
    const failedRequests: string[] = [];

    page.on("console", (message) => {
      consoleMessages.push({
        type: message.type(),
        text: message.text(),
        location: message.location()?.url,
      });
    });

    page.on("requestfailed", (request) => {
      const url = request.url();
      // Ignore known third-party service failures
      if (url.includes('google-analytics.com') ||
          url.includes('tawk.to') ||
          url.includes('facebook.net') ||
          url.includes('/_vercel/insights/')) {
        return;
      }
      failedRequests.push(`${request.method()} ${url}`);
    });

    const response = await page.goto("/videos", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 2000 }).catch(() => {});
    expect(response?.ok(), `Expected /videos response ok but got ${response?.status()}`).toBeTruthy();

    // Filter out known third-party errors (Tawk.to, Vercel, etc.)
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
      blockingConsoleErrors.length ? `Console errors detected: ${blockingConsoleErrors.map(e => e.text).join(" | ")}` : undefined,
    ).toEqual([]);

    expect(
      failedRequests,
      failedRequests.length ? `Failed requests: ${failedRequests.join(" | ")}` : undefined,
    ).toEqual([]);
  });
});
