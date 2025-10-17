# Checkout Blockers – Immediate Fix Plan

## 1. Embedded checkout never renders when Stripe JS is blocked (Chrome HAR)
- **Evidence:** In `apps.serp.co.har`, the request to `https://js.stripe.com/clover/stripe.js` returns `net::ERR_BLOCKED_BY_CLIENT`. When that script is stopped by content blockers, the embedded checkout iframe never appears, leaving the form blank.
- **Impact:** Customers running privacy/ad-block extensions cannot enter payment details, which matches the “checkout form missing” reports.
- **Status:** ✅ Shipped
- **What we delivered:**
  - Moved Stripe initialisation into the component and catch `loadStripe` resolving to `null`.
  - Toggle `stripeUnavailable` + `showStripeFallback` so the hosted CTA renders instantly with clear copy.
  - Emit analytics event `embedded_checkout_stripe_unavailable`.
  - Added Vitest coverage for the load failure path and a Playwright scenario that blocks `js.stripe.com`.
  - Manually revalidated by blocking `js.stripe.com` in DevTools.
- **Next follow-up:** Include this scenario in the full Playwright smoke matrix (currently targeted test only).

## 2. Stripe iframe requests aborted mid-flight (Opera HAR)
- **Evidence:** In `apps.serp.co - Opera.har`, numerous requests to `https://js.stripe.com/v3/elements-inner-express-checkout-...html` and assets like `https://b.stripecdn.com/.../GooglePay.html` are marked `net::ERR_ABORTED`. This matches Opera’s “VPN/Tracker blocking” or the user closing the page mid-load, but we can’t rely on the iframe mounting before we log success.
- **Impact:** Even if `stripe.js` loads, aborting the inner iframe keeps the embedded checkout blank. Without a fallback, the user is stuck.
- **Status:** ✅ Shipped
- **What we delivered:**
  - Listen for Stripe’s `checkout.error` postMessage and immediately flip to the fallback CTA.
  - Emit analytics event `embedded_checkout_iframe_error`.
  - Added Vitest coverage and a Playwright scenario that aborts the inner iframe request and asserts the fallback button appears.
- **Remaining follow-up:** Mirror the iframe error in server logs once we add request-context logging (not yet implemented).

## 3. Firefox (user report) – blank form despite clean HAR
- **Evidence:** The archive HAR (`apps.serp.co_Archive [25-10-17 15-21-04] - Firefox.har`) doesn’t surface explicit 4xx/5xx or `net::ERR_*`, yet the user still saw an empty form. Firefox’s Enhanced Tracking Protection (ETP) in “Strict” mode blocks third-party storage and can silently cancel iframe requests (Stripe/LINK) without leaving clear traces in the HAR.
- **Status:** 🚧 In progress / follow-up
- **Open tasks:**
  1. Add Playwright coverage (Firefox Strict profile or explicit cookie blocking) to confirm the fallback CTA renders automatically.
  2. Document support guidance for Firefox users (docs + canned responses).
  3. Capture and archive a Strict-mode HAR showing the blocking behaviour for regression.
- **Optional hardening:** introduce a dev flag or Playwright project that forces fallback to simplify manual QA.

Delivering this fix ensures the checkout stays functional even when third-party scripts are filtered, which is the primary blocker surfaced in the HAR. Remaining third-party analytics/Tawk warnings are noise and do not stop payment collection.

## 4. PostHog monitoring via REST API
- **Goal:** automatically page us when the embedded checkout falls back (`embedded_checkout_stripe_unavailable`, `embedded_checkout_iframe_error`). We’ll push this through PostHog’s REST API since the MCP flow is still unstable.
- **Status:** 🟡 Partial
- **What’s done:** Added `scripts/monitoring/create-checkout-fallback-alert.ts`, which upserts an insight that sums both fallback events over the last 24h and nudges operators to wire an alert.
- **Still needed:**
  1. Run the script with production credentials, capture the resulting insight ID, and create the alert (PostHog UI/API) with threshold “> 2 in 15 minutes” to Slack/email.
  2. Document the insight ID + alert ownership in the runbook once set up.
  3. Optional: extend the script (if PostHog permits) to auto-create the alert.
