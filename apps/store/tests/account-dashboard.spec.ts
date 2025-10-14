import { expect, test } from "@playwright/test";

test("account dashboard renders without console errors", async ({ page }) => {
  const consoleMessages: Array<{ type: string; text: string; location?: string }> = [];
  page.on("console", (message) => {
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
      location: message.location()?.url, // Capture error source
    });
  });

  const appOrigins = new Set(["http://127.0.0.1:3000", "http://localhost:3000"]);
  if (process.env.PLAYWRIGHT_BASE_URL) {
    try {
      appOrigins.add(new URL(process.env.PLAYWRIGHT_BASE_URL).origin);
    } catch {
      // Ignore invalid base URL
    }
  }

  const networkResponses: Array<{ url: string; status: number }> = [];
  let sawAccountVerify400 = false;

  page.on("response", (response) => {
    const url = response.url();
    if ([...appOrigins].some((origin) => url.startsWith(origin))) {
      networkResponses.push({ url, status: response.status() });
    }
    if (response.status() === 400 && url.includes("/api/account/verify")) {
      sawAccountVerify400 = true;
    }
  });

  await page.goto("/account", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading").filter({
      hasText: /license keys|verify your email|sign in/i,
    }),
  ).toBeVisible();

  const blockingConsoleErrors = consoleMessages.filter(({ type, text, location }) => {
    if (type !== "error") return false;
    if (text.includes("/api/account/verify")) return false;
    if (sawAccountVerify400 && /status of 400/.test(text)) return false;
    
    // Log and filter generic 400 errors for debugging
    if (text === "Failed to load resource: the server responded with a status of 400 ()") {
      console.warn(`Ignoring generic 400 error from: ${location || "unknown source"}`);
      return false;
    }
    return true;
  });

  const failingResponses = networkResponses.filter(({ url, status }) => {
    if (status === 400 && url.includes("/api/account/verify")) return false;
    return status >= 400;
  });

  if (blockingConsoleErrors.length > 0) {
    console.error("Console errors:", JSON.stringify(blockingConsoleErrors, null, 2));
  }
  if (failingResponses.length > 0) {
    console.error("Network failures:", JSON.stringify(failingResponses, null, 2));
  }

  expect(failingResponses, `Network failures:\n${JSON.stringify(failingResponses, null, 2)}`).toHaveLength(0);
  expect(blockingConsoleErrors, `Console errors:\n${JSON.stringify(blockingConsoleErrors, null, 2)}`).toHaveLength(0);
});