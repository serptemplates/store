import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://staging-apps.serp.co";
const DUB_TEST_LINK = process.env.DUB_TEST_LINK; // e.g., https://serp.cc/mds
const shouldRun = process.env.RUN_STAGING_SMOKE === "1";
const describeFn = shouldRun ? test.describe : test.describe.skip;

describeFn("staging smoke: dub attribution", () => {
  test("sets dub_id cookie on staging", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    if (DUB_TEST_LINK) {
      await page.goto(DUB_TEST_LINK, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
    } else {
      // Fallback: pass affiliate via query param expected by Dub (?via=...)
      await page.goto(`${BASE_URL}/?via=mds`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
    }

    // Read cookies for the staging domain
    const cookies = await context.cookies(BASE_URL);
    const dubCookie = cookies.find((c) => c.name === "dub_id");
    expect(dubCookie, `Expected dub_id cookie on ${BASE_URL}`).toBeTruthy();

    const raw = dubCookie?.value ?? "";
    const normalized = raw.startsWith("dub_id_") ? raw.substring("dub_id_".length) : raw;
    expect(normalized.length).toBeGreaterThan(0);

    await context.close();
  });
});
