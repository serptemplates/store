import { expect, test } from "@playwright/test";

test("account dashboard renders without console errors", async ({ page }) => {
  const consoleMessages: Array<{ type: string; text: string }> = [];
  page.on("console", (message) => {
    consoleMessages.push({ type: message.type(), text: message.text() });
  });

  const networkResponses: Array<{ url: string; status: number }> = [];
  page.on("response", (response) => {
    const url = response.url();
    if (url.startsWith("http://127.0.0.1:3000") || url.startsWith("http://localhost:3000")) {
      networkResponses.push({ url, status: response.status() });
    }
  });

  await page.goto("/account?preview=1", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Purchase history" })).toBeVisible();

  const errorLogs = consoleMessages.filter((entry) => entry.type === "error");
  if (errorLogs.length > 0) {
    console.error("Console errors:", JSON.stringify(errorLogs, null, 2));
  }

  expect(errorLogs).toHaveLength(0);
});
