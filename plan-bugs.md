# Checkout Blockers – Immediate Fix Plan

## 1. Embedded checkout never renders when Stripe JS is blocked (Chrome HAR)
- **Evidence:** In `apps.serp.co.har`, the request to `https://js.stripe.com/clover/stripe.js` returns `net::ERR_BLOCKED_BY_CLIENT`. When that script is stopped by content blockers, the embedded checkout iframe never appears, leaving the form blank.
- **Impact:** Customers running privacy/ad-block extensions cannot enter payment details, which matches the “checkout form missing” reports.
- **Plan of action:**
  1. Move the `loadStripe(requireStripePublishableKey())` call into the component so we can catch its rejection / `null` resolution when the script is blocked.
  2. When Stripe fails to load, flip a `stripeUnavailable` state and immediately render the hosted-checkout fallback CTA (with clear copy asking users to open Stripe in a new tab and optionally disable blockers). Also surface a Toast/alert explaining why the embedded form is unavailable.
  3. Emit an analytics event (PostHog + console logger) under a distinct name, e.g. `embedded_checkout_stripe_unavailable`, so we can monitor frequency. Add a server log (e.g. `checkout.embed.stripe_unavailable`) to correlate with API logs.
  4. Add a unit test that mocks `loadStripe` returning `null` to verify the fallback path renders, plus a Playwright smoke script that blocks `js.stripe.com` network requests and asserts the fallback button appears.
  5. After the code change, verify manually by blocking `js.stripe.com` in DevTools and confirming the fallback renders within the timeout window.
  6. **Testing matrix:** run the new Playwright scenario against Chrome + Chromium-based browsers with uBlock/Brave shield rules (can be simulated via `page.route('**/js.stripe.com/**', route => route.abort())`).

## 2. Stripe iframe requests aborted mid-flight (Opera HAR)
- **Evidence:** In `apps.serp.co - Opera.har`, numerous requests to `https://js.stripe.com/v3/elements-inner-express-checkout-...html` and assets like `https://b.stripecdn.com/.../GooglePay.html` are marked `net::ERR_ABORTED`. This matches Opera’s “VPN/Tracker blocking” or the user closing the page mid-load, but we can’t rely on the iframe mounting before we log success.
- **Impact:** Even if `stripe.js` loads, aborting the inner iframe keeps the embedded checkout blank. Without a fallback, the user is stuck.
- **Plan of action:** reuse the same fallback logic as above, but trigger it if the iframe stays in “loading” state for > N seconds **or** fires an `error` event due to aborted requests. Additionally:
  1. Attach an `onerror` listener to the `<EmbeddedCheckout>` container (Stripe fires a postMessage with `type: 'checkout.error'` on iframe load failures); capture that and flip to fallback immediately.
  2. Log `embedded_checkout_iframe_error` with the payload (e.g. aborted, navigation cancelled) for visibility. Mirror the signal in our server logs (`checkout.embed.iframe_error`) so ops can grep production logs by `requestId`.
  3. Update the Playwright test to simulate aborts by routing `page.route('**/elements-inner-express-checkout**', route => route.abort())` and assert the fallback renders plus the analytics call fires. Extend unit coverage to ensure the error handler toggles fallback state.
  4. Manual: in Chrome DevTools, right-click the iframe -> “Block request URL” to mimic Opera’s behavior, reload, and confirm fallback CTA.
  5. **Follow-up testing:** add a Playwright scenario that blocks the inner iframe route (Opera/VPN) and another that launches Firefox in strict mode (via custom profile or `browserContext.overridePermissions`) to ensure the fallback CTA renders automatically. Track an issue to automate these so we don’t rely only on manual checks.

## 3. Firefox (user report) – blank form despite clean HAR
- **Evidence:** The archive HAR (`apps.serp.co_Archive [25-10-17 15-21-04] - Firefox.har`) doesn’t surface explicit 4xx/5xx or `net::ERR_*`, yet the user still saw an empty form. Firefox’s Enhanced Tracking Protection (ETP) in “Strict” mode blocks third-party storage and can silently cancel iframe requests (Stripe/LINK) without leaving clear traces in the HAR.
- **Plan of action:**
  1. After shipping the Stripe fallback above, verify the hosted checkout CTA appears when Firefox runs in “Strict” ETP with `https://js.stripe.com` or third-party cookies blocked. This will address the user’s symptom even though the HAR looks clean.
  2. Add a troubleshooting note (docs + support template) instructing Firefox users to disable “Strict” tracking or use the fallback button if the embedded form fails.
  3. Capture a fresh Firefox HAR while ETP is set to **Strict** and “Persist Logs” is enabled; confirm it now records blocked requests (look for `NS_ERROR_BLOCKED_BY_POLICY`). Keep the file for regression.
- **Testing:** Extend the Playwright suite with a Firefox run that blocks third-party cookies/storage via `browserContext.grantPermissions([], {origin: 'https://js.stripe.com'})` + `context.addCookies` restrictions, ensuring the fallback path stays reliable on Gecko-based browsers. Capture this as a new automated test case so it runs in CI once Playwright coverage is enabled.

Delivering this fix ensures the checkout stays functional even when third-party scripts are filtered, which is the primary blocker surfaced in the HAR. Remaining third-party analytics/Tawk warnings are noise and do not stop payment collection.

## 4. PostHog monitoring via REST API
- **Goal:** automatically page us when the embedded checkout falls back (`embedded_checkout_stripe_unavailable`, `embedded_checkout_iframe_error`). We’ll push this through PostHog’s REST API since the MCP flow is still unstable.
- **Plan of action:**
  1. **Create (or reuse) an insight** via `POST https://us.i.posthog.com/api/projects/{PROJECT_ID}/insights/` with the bearer key `phx_TFlpM53s9ZRNOD96AylQEK2hS2XlIrJAy98BKIRIveIww0V`. The HogQL/filters should aggregate the two events over a 15‑minute window (Trends insight, total volume). Keep the returned `id`.
  2. **Wire an alert** with `POST /api/projects/{PROJECT_ID}/insights/{id}/alerts/` (or the new alerts endpoint once enabled) using thresholds like “count > 2 within 15 minutes” and delivery channel (Slack webhook/email). Include `trigger_on="total_volume"` and the Slack channel metadata.
  3. **Script it:** add a small script under `scripts/monitoring/create-checkout-fallback-alert.ts` that reads the PostHog key from `.env`, calls the two endpoints above, and prints the insight/alert IDs. Guard it so reruns update the existing insight (use a deterministic `name` or `short_id`).
  4. **Verify:** run the script locally and confirm via `curl`:
     ```bash
     curl -H "Authorization: Bearer $POSTHOG_KEY" \
       "https://us.i.posthog.com/api/projects/39305/insights/?search=Checkout%20Fallback"
     ```
     and trigger a dummy fallback in dev to ensure the alert posts to Slack/email.
  5. **Document ownership:** capture the insight/alert IDs and escalation path in the runbook so CX/ops know how to modify thresholds without code changes.
