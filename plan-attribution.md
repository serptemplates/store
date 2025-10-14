# Attribution & License Plan

## Explanation
- Real Stripe checkouts redirect to `https://apps.serp.co/checkout/success` without the `session_id={CHECKOUT_SESSION_ID}` placeholder (see product definitions such as `apps/store/data/products/onlyfans-downloader.yaml:10`).  
  - The success page (`apps/store/app/checkout/success/SuccessContent.tsx:228`) requires the `session_id` query param to retrieve the order (`processCheckoutSession`) and populate `ConversionTracking`. Without it, no GTM/PostHog purchase events fire and analytics miss the sale.
- Tests currently *enforce* this broken redirect by asserting the fallback success URL equals the placeholder-less string (`apps/store/tests/lib/buy-button-links.test.ts:36`), so the regression slips through.
- GHL payment-link purchasers land on `/checkout/success?source=ghl_pmtlink&product=<slug>` (no payment id in the redirect). The success page currently only hydrates analytics when a webhook-sourced payment id is present—our preview harness passes `payment_id=` so tests succeed, but real redirects do not, leaving attribution dark. The webhook route (`apps/store/app/api/webhooks/ghl/payment/route.ts:214`) only logs and ensures the account exists; it neither creates internal license records nor feeds analytics. Licenses shown in `/account` are fetched back from GHL via `fetchContactLicensesByEmail` (`apps/store/app/account/page.tsx:238`), not generated here.
- Because neither flow forwards canonical purchase metadata, downstream attribution (GTM, PostHog, etc.) under-reports conversions and the `/account` view lacks authoritative data for GHL buyers.

## Findings
1. **Broken Stripe success URLs**  
   - Configured URLs omit `?session_id={CHECKOUT_SESSION_ID}` (`apps/store/data/products/*.yaml`).  
   - Success page logic silently no-ops without the session id (`SuccessContent.tsx:228-268`).  
   - Purchase pixels (`apps/store/app/checkout/success/tracking.tsx:44-128`) never run.
2. **Test suite codifies the bug**  
   - `buy_button_links` spec expects the incorrect fallback URL (`tests/lib/buy-button-links.test.ts:36-53`).  
   - No tests cover conversion tracking or dataLayer emissions.
3. **GHL payment-link gap**  
   - Webhook records log entries only; no persistence for license/order states.  
   - Success page has no branch to hydrate data for `source=ghl_*` when only `product=` is provided.  
   - Attribution/pixels cannot fire for those purchases even though the preview harness succeeds with `payment_id=`.
4. **License visibility relies on GHL**  
   - `/account` merges internal orders with licenses scraped from GHL (`apps/store/lib/account/license-integration.ts:167-220`).  
   - Without internal license creation for GHL sales, we lack a trusted record in our DB.

## Task Items
1. **Enforce correct Stripe success URLs**
   - Update product content (automation or script) to include `?session_id={CHECKOUT_SESSION_ID}`.  
   - Harden `getOfferConfig` to append the placeholder when missing to prevent future regressions.
2. **Repair analytics pipeline (Stripe + PayPal)**
   - Adjust success-page logic to surface an explicit warning/error when required identifiers are absent.  
   - Add order hydration for PayPal redirects (`source=paypal&order_id=`) via our existing capture API so `ConversionTracking` fires for PayPal purchases as well.  
   - Add integration/Playwright coverage that completes mocked Stripe and PayPal checkouts and asserts dataLayer/PostHog events fire.
3. **GHL payment-link ingestion**
   - Persist webhook payloads (transaction id, amount, sku/license metadata) in a queryable table.  
   - Expose an API for the success page to resolve GHL purchases using the real redirect shape (`source=ghl_pmtlink&product=<slug>`) while still supporting the synthetic `payment_id=` used in preview tests.  
   - Extend success page to hydrate `ConversionTracking` from that API and push analytics events.  
   - Create/update license records for GHL orders so `/account` doesn’t rely on scraping GHL fields.
4. **Testing & monitoring**
   - Fix `buy_button_links` expectations to require the session-id placeholder.  
   - Add regression tests for `ConversionTracking` (unit) and success-page behaviour (Playwright).  
   - Instrument logs/alerts when success page runs without actionable identifiers.

## Test Coverage Plan
- **Unit**:  
  - `productToHomeTemplate` + new helper ensuring success URLs include placeholders.  
  - `ConversionTracking` to confirm it pushes GTM payloads given order data.
- **Integration**:  
  - Stripe checkout happy-path test that stubs Stripe and asserts analytics hooks.  
  - GHL webhook → persistence → success-page lookup once the flow is built.
- **E2E / Playwright**:  
  - Simulate a completed checkout redirect and verify purchase events reach `window.dataLayer` and PostHog stubs.  
  - Future: payment-link redirect path that exercises the new API and license creation.
