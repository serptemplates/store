import { expect, test } from "@playwright/test";

test.describe("Dub Analytics e2e", () => {
  test.use({ viewport: { width: 1280, height: 1200 } });

  test("sets dub_id cookie and loads SDK with serp.cc + outbound domains", async ({ page }) => {
    const pk = process.env.NEXT_PUBLIC_DUB_PUBLISHABLE_KEY;
    test.skip(!pk, "NEXT_PUBLIC_DUB_PUBLISHABLE_KEY not provided to webServer env");

    await page.goto("/?via=mds", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    // dub_id cookie present (set by Dub SDK reading ?via=mds)
    const cookies = await page.context().cookies();
    const dub = cookies.find((c) => c.name === "dub_id");
    expect(dub && typeof dub.value === "string" && dub.value.length > 0).toBe(true);

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
    expect(attrs!.publishableKey).toBe(pk);
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
});
