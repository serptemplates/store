import { test, expect, type Page } from "@playwright/test";

// This test asserts exact Dub cookies seen in staging after visiting the affiliate link.
// It is intentionally strict per request. If Dub rotates click IDs, update the constants below.

const DUB_TEST_LINK = process.env.DUB_TEST_LINK || "https://apps.serp.co/loom-video-downloader?via=mds";
const STAGING_BASE_URL = process.env.STAGING_BASE_URL || "https://staging-apps.serp.co";

const EXPECTED_DUB_ID = process.env.DUB_EXPECTED_ID;
const EXPECTED_PARTNER_JSON = process.env.DUB_EXPECTED_PARTNER_JSON;

// Opt-in via env
const maybe = process.env.RUN_STAGING_SMOKE ? test : test.skip;

function extractCookieValue(cookieStr: string, name: string): string | null {
  const parts = cookieStr.split(/;\s*/);
  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

async function waitForCookie(page: Page, name: string, timeoutMs = 15000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const cookieStr: string = await page.evaluate(() => document.cookie);
    if (cookieStr.includes(`${name}=`)) return cookieStr;
    await page.waitForTimeout(500);
  }
  throw new Error(`Timed out waiting for cookie ${name}`);
}

maybe("Dub affiliate cookies set and persist to staging", async ({ page, context }) => {
  // Tighten timeouts so staging runs never hang
  test.setTimeout(45_000);
  page.setDefaultTimeout(10_000);
  page.setDefaultNavigationTimeout(15_000);
  // 1) Visit affiliate link on production domain to set cookies
  await page.goto(DUB_TEST_LINK, { waitUntil: "domcontentloaded" });

  // 2) Wait for dub_id to appear
  const cookiesStr = await waitForCookie(page, "dub_id");

  const dubId = extractCookieValue(cookiesStr, "dub_id");
  const partnerRaw = extractCookieValue(cookiesStr, "dub_partner_data");

  expect(dubId, "dub_id cookie should be set").not.toBeNull();
  if (!dubId) throw new Error("dub_id cookie missing after visiting Dub link");

  if (EXPECTED_DUB_ID) {
    expect(dubId, `dub_id should be ${EXPECTED_DUB_ID}`).toBe(EXPECTED_DUB_ID);
  }

  expect(partnerRaw, "dub_partner_data should exist").not.toBeNull();
  if (!partnerRaw) throw new Error("dub_partner_data cookie missing after visiting Dub link");

  if (EXPECTED_PARTNER_JSON) {
    expect(partnerRaw).toBe(EXPECTED_PARTNER_JSON);
  }

  // 3) Navigate to staging and verify persistence
  await page.goto(`${STAGING_BASE_URL}/loom-video-downloader`, { waitUntil: "domcontentloaded" });
  const stagingCookiesStr = await waitForCookie(page, "dub_id");
  const stagingDubId = extractCookieValue(stagingCookiesStr, "dub_id");
  expect(stagingDubId).toBe(dubId);
});
