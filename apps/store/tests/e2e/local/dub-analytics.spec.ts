import { expect, test, type Page } from "@playwright/test";

test.describe("Dub Analytics e2e", () => {
  test.use({ viewport: { width: 1280, height: 1200 } });

  async function waitForCookie(page: Page, name: string, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const cookieStr: string = await page.evaluate(() => document.cookie);
      if (cookieStr.includes(`${name}=`)) {
        return;
      }
      await page.waitForTimeout(500);
    }
    throw new Error(`Timed out waiting for cookie ${name}`);
  }

  test("sets dub_id cookie and loads SDK with serp.cc + outbound domains", async ({ page }) => {
    const pk = process.env.NEXT_PUBLIC_DUB_PUBLISHABLE_KEY;

    const clickResponsePromise = page.waitForResponse((response) =>
      response.url().includes("api.dub.co/track/click")
    );

    await page.goto("/?via=mds", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    const clickResponse = await clickResponsePromise;
    const clickData = await clickResponse.json();

    // dub_id cookie present (set by Dub SDK reading ?via=mds)
    let cookies = await page.context().cookies();
    let dub = cookies.find((c) => c.name === "dub_id");

    const isForbidden = clickData?.error?.code === "forbidden";
    if (isForbidden) {
      expect(clickData.error.message).toContain("allowed hostnames");
      expect(dub).toBeUndefined();
    } else {
      await waitForCookie(page, "dub_id");
      cookies = await page.context().cookies();
      dub = cookies.find((c) => c.name === "dub_id");
      expect(dub && typeof dub.value === "string" && dub.value.length > 0).toBe(true);
      expect(dub?.value).not.toBe("mds");
      expect(dub?.value).not.toBe("dub_id_mds");

      const partner = cookies.find((c) => c.name === "dub_partner_data");
      expect(partner).toBeTruthy();
      const partnerDecoded = partner?.value ? decodeURIComponent(partner.value) : "{}";
      const partnerData = JSON.parse(partnerDecoded);
      expect(partnerData.clickId).toBe(dub?.value);
    }

    // SDK script is injected with correct attributes
    const attrs = await page.evaluate(() => {
      const s = Array.from(document.querySelectorAll('script')).find(el => el.getAttribute('data-sdkn') === '@dub/analytics');
      if (!s) return null;
      return {
        publishableKey: s.getAttribute('data-publishable-key'),
        src: s.getAttribute('src'),
        domains: s.getAttribute('data-domains'),
        cookieOptions: s.getAttribute('data-cookie-options'),
        queryParams: s.getAttribute('data-query-params'),
      };
    });
    expect(attrs).toBeTruthy();
    if (pk) {
      expect(attrs!.publishableKey).toBe(pk);
    } else if (attrs!.publishableKey) {
      expect(attrs!.publishableKey).toMatch(/^dub_pk_/);
    } else {
      expect(attrs!.publishableKey).toBeNull();
    }
    expect(attrs!.src || "").toContain("dubcdn.com/analytics/script");
    const domains = attrs!.domains ? JSON.parse(attrs!.domains) : {};
    expect(domains.refer).toBe("serp.cc");
    expect(domains.outbound).toEqual(expect.arrayContaining([
      "buy.stripe.com",
      "checkout.stripe.com",
      "billing.stripe.com",
      "apps.serp.co",
      "extensions.serp.co",
      "tools.serp.co",
      "store.serp.co",
      "serp.co",
    ]));

    // cross-domain outbound links to serp.co include ?dub_id=
    if (isForbidden) {
      return;
    }

    const outboundWithDub = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      const candidates = anchors
        .map(a => a.getAttribute('href') || '')
        .filter(h => /https?:\/\/(?:store|extensions|tools|www\.)?serp\.co\b/.test(h));
      return candidates.slice(0, 5).map(href => ({ href, hasDub: /[?&]dub_id=/.test(href) }));
    });
    expect(outboundWithDub.length).toBeGreaterThan(0);
    expect(outboundWithDub.some((x: any) => x.hasDub)).toBe(true);
  });

  test("sets dub_id cookie from ?dub_id param", async ({ page }) => {
    const expected = "dub_id_test_cookie_123";

    await page.goto(`/?dub_id=${encodeURIComponent(expected)}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForCookie(page, "dub_id");

    const cookies = await page.context().cookies();
    const dub = cookies.find((c) => c.name === "dub_id");
    expect(dub?.value).toBe(expected);
  });
});
