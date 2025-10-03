import { expect, test } from "@playwright/test";

test.describe("videos library", () => {
  test("loads without console or network errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });

    const response = await page.goto("/videos", { waitUntil: "networkidle" });
    expect(response?.ok(), `Expected /videos response ok but got ${response?.status()}`).toBeTruthy();

    expect(
      consoleErrors,
      consoleErrors.length ? `Console errors detected: ${consoleErrors.join(" | ")}` : undefined,
    ).toEqual([]);

    expect(
      failedRequests,
      failedRequests.length ? `Failed requests: ${failedRequests.join(" | ")}` : undefined,
    ).toEqual([]);
  });
});
