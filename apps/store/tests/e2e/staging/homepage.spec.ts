import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://staging-apps.serp.co";
const shouldRun = process.env.RUN_STAGING_SMOKE === "1";
const describeFn = shouldRun ? test.describe : test.describe.skip;

type ConsoleEntry = {
  type: string;
  text: string;
  location?: string | null;
};

function isNonBlockingConsoleError(text: string, location?: string | null) {
  if (text === "Failed to load resource: the server responded with a status of 400 ()") {
    return true;
  }

  if (location?.includes("/_vercel/insights/") || text.includes("/_vercel/insights/")) {
    return true;
  }

  if (text.includes("/_next/static/")) {
    if (
      text.includes("MIME type ('text/html') is not a supported stylesheet MIME type") ||
      text.includes("Failed to load resource: the server responded with a status of 404 (Not Found)") ||
      text.includes("Failed to load resource: the server responded with a status of 500 (Internal Server Error)") ||
      text.includes("Refused to execute script")
    ) {
      return true;
    }
  }

  return false;
}

function collectConsoleMessages(page: Page) {
  const consoleMessages: ConsoleEntry[] = [];

  page.on("console", (message) => {
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
      location: message.location()?.url,
    });
  });

  page.on("pageerror", (error) => {
    consoleMessages.push({ type: "error", text: error.message, location: undefined });
  });

  return consoleMessages;
}

function filterBlockingErrors(messages: ConsoleEntry[]) {
  return messages.filter(({ type, text, location }) => {
    if (type !== "error") return false;
    return !isNonBlockingConsoleError(text, location ?? undefined);
  });
}

async function warmAndReload(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
}

describeFn("staging smoke: homepage", () => {
  test("renders without blocking console errors", async ({ page }) => {
    const consoleMessages = collectConsoleMessages(page);

    await warmAndReload(page, `${BASE_URL}/`);

    await expect(page.getByRole("link", { name: "SERP Apps" })).toBeVisible();

    const blockingConsoleErrors = filterBlockingErrors(consoleMessages);

    expect(
      blockingConsoleErrors,
      blockingConsoleErrors.length
        ? `Console errors:\n${blockingConsoleErrors.map((e) => `${e.location ?? "<unknown>"}: ${e.text}`).join("\n")}`
        : undefined,
    ).toHaveLength(0);
  });
});
