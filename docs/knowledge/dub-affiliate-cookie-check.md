# Dub affiliate cookie check

Goal: confirm Dub partner tracking works for `?via=mds` on production and that
the `@dub/analytics` script is actually running.

Expected behavior (per Dub docs + analytics script):
- `@dub/analytics` injects `https://www.dubcdn.com/analytics/script.*.js`
- `?via=mds` triggers `POST https://api.dub.co/track/click` and returns a `clickId`
- Cookie `dub_id` is set to that `clickId` (opaque, not `dub_id_mds`)
- `?dub_id=<clickId>` sets the `dub_id` cookie directly to the param value
- Cookie `dub_partner_data` stores partner + discount metadata (URL-encoded JSON)
- `affiliateId=mds` may still appear from legacy tracking

If you see no Dub cookies and no `track/click` call, the Dub script did not run.
If you see `dub_id` equal to the `via` value, something else is writing it
(the middleware should no longer do this).

Local dev note:
- `NEXT_PUBLIC_RUNTIME_ENV=preview` to allow Dub analytics to run outside production.
- When `cookieOptions.domain` is set to `.serp.co`, browsers will not set Dub
  cookies on `localhost`/`127.0.0.1`. For local verification, the domain must
  be omitted or conditional.
- `api.dub.co/track/click` will return `forbidden` on `127.0.0.1` unless the
  hostname is added to Dub “allowed hostnames”. In that case, Dub cookies will
  not be set locally, but the script + request still verify wiring.

Headless Playwright check (run from `apps/store`):

```bash
node - <<'NODE'
const { chromium } = require('playwright');

(async () => {
  const url = 'https://apps.serp.co/loom-video-downloader?via=mds';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let analyticsScriptUrl = null;
  let clickResponse = null;
  page.on('response', async (response) => {
    const resUrl = response.url();
    if (!analyticsScriptUrl && resUrl.includes('dubcdn.com/analytics/script')) {
      analyticsScriptUrl = resUrl;
    }
    if (resUrl.includes('api.dub.co/track/click')) {
      try {
        clickResponse = await response.json();
      } catch {}
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);

  const cookies = await context.cookies();
  const dubCookies = cookies.filter((cookie) => cookie.name.startsWith('dub'));
  const dubId = dubCookies.find((cookie) => cookie.name === 'dub_id')?.value ?? null;

  console.log(JSON.stringify({ analyticsScriptUrl, clickResponse, dubCookies, dubId }, null, 2));

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
```
