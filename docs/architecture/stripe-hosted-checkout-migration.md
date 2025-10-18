# Stripe Hosted Checkout Migration Spec

## Overview
- Goal: introduce Stripe-hosted Checkout alongside the existing embedded flow so we can toggle between them via configuration.
- Outcomes: improve reliability, leverage Stripe-first tooling (abandoned cart emails, analytics, revenue recovery), cut maintenance burden, and preserve existing metadata/licensing automation handled in `apps/store/lib/payments/stripe-webhook/events/checkout-session-completed.ts:1`.

## Current Checkout Snapshot
- **UI:** The checkout route (`apps/store/app/checkout/page.tsx:1`) renders an embedded Stripe `EmbeddedCheckout` iframe with a custom wrapper that toggles PayPal (`EmbeddedCheckoutView`).
- **Session creation:** `/api/checkout/session` (`apps/store/app/api/checkout/session/route.ts:1`) accepts `uiMode` and builds either embedded credentials (`client_secret`) or a hosted redirect URL using `createStripeCheckoutSession` (`apps/store/lib/checkout/session/pricing.ts:1`).
- **Fallbacks:** Embedded failures trigger hosted Checkout fallback URLs, but this path is secondary and missing several Stripe capabilities.
- **Persistence & metadata:** Sessions are persisted via `persistCheckoutSession` / `upsertCheckoutSession`, the webhook marks completions, provisions licenses, syncs to GHL, and records analytics.
- **Pain points:** iframe fragility, custom UI upkeep, limited Stripe-provided recovery/analytics, duplicated logic to toggle between modes, and extra code surface for error handling.

## Stripe Capability Mapping
| Capability | Current Coverage | Hosted Checkout Opportunity |
| --- | --- | --- |
| Appearance customization [[docs](https://docs.stripe.com/payments/checkout/customization/appearance)] | UI managed manually in React; embedded checkout inherits minimal Stripe styling | Use `custom_text`, `custom_fields`, `customization` & branding palette APIs on `Checkout.Session` to align hosted page with apps.serp.co without custom frontend code |
| Save data during payment [[docs](https://docs.stripe.com/payments/checkout/save-during-payment)] | Manual metadata persistence + webhook license creation | Enable `customer_creation`, `allow_promotion_codes`, and `consent_collection` in Checkout so Stripe saves emails, addresses, tax IDs; minimize local form handling |
| Metadata [[docs](https://docs.stripe.com/api/metadata)] | Already writing session metadata in `pricing.ts` | Continue populating metadata; plan additional keys for license tier/entitlements & analytics; ensure `after_completion[redirect]` passes `session_id` for thank-you tracking |
| Post-purchase redirects [[docs](https://docs.stripe.com/payments/checkout/custom-success-page)] | `success_url` currently managed per product | Use `after_completion` with `redirect` plus query params for license key handshake; explore `hosted_confirmation` for inline messaging when redirect unavailable |
| Abandoned cart recovery [[docs](https://docs.stripe.com/payments/checkout/abandoned-carts)] | Custom "stale session" cron + manual outreach | Turn on Stripe Checkout recovery emails and surface `checkout.session.expired` webhook variants to trigger in-app reminders |
| Conversion funnel analytics [[docs](https://docs.stripe.com/payments/checkout/analyze-conversion-funnel)] | PostHog + GA events for embedded flow | Adopt Stripe dashboards, pull `session.completed` & `session.expired` into analytics warehouse, correlate with GA by passing `client_reference_id` |
| Forward card details to third-party APIs [[docs](https://docs.stripe.com/payments/vault-and-forward)] | No direct secure forwarding; sensitive fields never hit our servers | Evaluate Stripe Forwarding (beta) for license upgrades needing partner APIs; guard with region/PCI readiness |
| Revenue recovery analytics [[docs](https://docs.stripe.com/billing/revenue-recovery/recovery-analytics)] | Limited to internal reports | Feed Checkout/Billing metrics into ops dashboards, use Stripe's recovery KPIs to tune follow-up |
| Error handling [[docs](https://docs.stripe.com/api/errors/handling)] | Custom try/catch around fetch + fallback UI | Rely on hosted error surfaces; centralize API error mapping in `/api/checkout/session` and simplify frontend to redirect |
| Entitlements [[docs](https://docs.stripe.com/api/entitlements/active-entitlement)] | Licenses issued via custom service | Model Stripe Entitlements for premium tiers; sync entitlements in webhook pipeline alongside our license generator |

## Proposed Architecture (Hosted-First)
1. **Client flow**
   - Add a hosted redirect surface that lives alongside the current embedded page. The product CTA uses `useCheckoutRedirect` (`apps/store/components/product/useCheckoutRedirect.ts:1`) to call `/api/checkout/session` requesting `uiMode: "hosted"` by default; setting the env flag (for example, `NEXT_PUBLIC_CHECKOUT_UI=embedded`) forces the legacy embedded path for QA or rollback.
   - The API returns the `url`; the client immediately navigates (`window.location.href` or 303 redirect for SSR scenarios).
   - No PayPal toggle is required in this mode—Stripe Checkout will present the enabled payment methods from the Dashboard configuration.

2. **Session creation**
   - Promote hosted Checkout options to default whenever the flag requests them in `createStripeCheckoutSession`:
     - Set `ui_mode: 'hosted'`.
     - Populate `customer_creation`, `customer_update`, `consent_collection`, `phone_number_collection`, `invoice_creation`, etc., using product config flags.
     - Use `line_items` for primary product + order bump; store upsell metadata in `metadata` + `payment_intent_data[metadata]` as today.
   - Expand use of `after_expiration[recovery]` and `automatic_tax` according to product needs.
   - Use Stripe’s native order bump support (extra line items and upsell settings) instead of custom toggle UI while continuing to write order-bump metadata so downstream systems remain compatible.

3. **Success & cancellation**
   - Maintain `success_url` with `{CHECKOUT_SESSION_ID}`; update thank-you page to fetch session details server-side using Stripe API for display (verify mode & entitlements before showing license key).
   - Introduce `after_completion[hosted_confirmation]` for cases where we want to show inline license key if webhook completes quickly.

4. **Webhooks & entitlements**
   - Extend `handleCheckoutSessionCompleted` to reconcile Stripe Entitlements and map to our license service. Store entitlements metadata for downstream automation.
   - Add new handler for `checkout.session.async_payment_failed` and `...expired` to track recoverable failures.

5. **Analytics & recovery**
   - Mirror Stripe Checkout statuses into warehouse (via job reading `checkout_sessions` table + Stripe event payloads).
   - Add GA/PostHog instrumentation around redirect events instead of iframe readiness (fire events when `url` received, when success page loads, when `session_id` validated).

## Implementation Plan (Chronological)
### Phase 0 – Discovery & Prerequisites (Week 1)
1. List every product that links to `/checkout`, noting order-bump usage and any PayPal dependencies.
2. Confirm Stripe price coverage (test + live IDs) for each product and bump; document missing assets.
3. Audit required environment variables (`STRIPE_SECRET_KEY_*`, `NEXT_PUBLIC_SITE_URL`, analytics keys) and capture discrepancies across dev/staging/prod.
4. Establish launch goals (conversion lift, cart recovery, support KPIs) with stakeholders and baseline current metrics.
5. Optional: review compliance considerations (Stripe Forwarding, Entitlements) to decide if they remain in scope.

### Phase 1 – Baseline Hosted Checkout (Weeks 2–3)
1. **Feature flag plumbing**
   1. Add `NEXT_PUBLIC_CHECKOUT_UI` (and server-side twin if needed) defaulting to hosted, with `"embedded"` as the opt-in override.
   2. Update `useCheckoutRedirect` and server handlers to branch on the flag and request hosted sessions when not explicitly set to `embedded`.
2. **Hosted entry point**
   1. Create a hosted redirect component/page that fetches the session URL and navigates immediately.
   2. Provide a manual fallback link/button to the embedded experience for QA.
3. **API adjustments**
   1. Teach `/api/checkout/session` to honor the flag and populate hosted-specific parameters (`customer_creation`, `after_expiration`, Stripe-native order bump line items).
   2. Ensure metadata parity between hosted and embedded responses so downstream systems stay unchanged.
4. **Success experience**
   1. Verify the success page reads session details via Stripe SDK regardless of mode.
   2. Confirm license rendering waits for webhook updates in both flows.
5. **Testing & QA**
   1. Extend unit tests (`tests/api/checkout-session.test.ts`, `__tests__/checkout-store-metadata-update.test.ts`) to cover both flag states.
   2. Update Playwright smoke/e2e tests to execute once per mode and capture console/network logs via Playwright MCP.
   3. Run manual regression checklist (`docs/upsell-*`) for embedded and hosted configurations.
6. **Rollout**
   1. Enable hosted flag in staging, monitor webhooks/logs, and review analytics.
   2. Flip production flag once metrics look good; keep rollback instructions (“set flag to embedded, redeploy”) in runbook.

### Phase 2 – Advanced Hosted Capabilities (Weeks 4–5)
1. Configure Stripe Appearance/branding (Dashboard + API) and record settings alongside product schema.
2. Enable expanded data capture (address/phone/tax), update webhook persistence, and confirm CRM integrations ingest new fields.
3. Turn on Stripe recovery emails; add handlers/logging for `checkout.session.expired` and push notifications into CRM/PostHog.
4. Build analytics dashboards combining Stripe funnel metrics with GA/PostHog sessions; define alert thresholds.
5. (Optional) Pilot Stripe Forwarding behind its own flag after PCI review; document proxy design.

### Phase 3 – Entitlements & Automation (Week 6)
1. Finalize entitlements mapping among product, engineering, and support stakeholders.
2. Update `handleCheckoutSessionCompleted` to read Stripe entitlements and persist them to order metadata.
3. Enhance the license service to reconcile Stripe entitlements with our provisioning pipeline.
4. Add monitoring/alerts for entitlement mismatches or missing entitlements post-checkout.

## Phase 0 Discovery Status
- [x] **Product inventory:** 95 product definitions under `apps/store/data/products`. 28 attach the `serp-downloaders-bundle` order bump; the rest either omit the field or leave it blank (treat as “no bump” today). Automated summary script lives in this spec’s history.
- [x] **Current destinations audited:** Every product now declares `checkout.destinations` (embedded + hosted, with GHL links recorded where applicable) so we can toggle flows without editing content files.
- [x] **Stripe pricing coverage review:** Every product declares a live `stripe.price_id`. None currently specify `stripe.test_price_id`; our existing Stripe helper clones live prices when the test key is present, so we must ensure `STRIPE_SECRET_KEY_TEST` is populated before QA can hit hosted Checkout in test mode.
- [x] **Env variable parity confirmed:** Key requirements gathered (`STRIPE_SECRET_KEY`, `STRIPE_SECRET_KEY_TEST`, `NEXT_PUBLIC_SITE_URL`, analytics keys). All required entries live in the shared `.env`; run `pnpm --filter @apps/store validate:env` whenever the file changes and spot-check with `pnpm --filter @apps/store dev` to ensure runtime env matches expectations.
- ~~**Metrics baseline captured:**~~ _Skip: baseline snapshot deemed unnecessary for this rollout; measure post-launch impact via live Stripe + internal dashboards instead._
- [ ] **Compliance sign-off:** Stripe Forwarding remains optional. Entitlements automation is deferred; revisit legal/PCI review only when we reintroduce that scope.

## Phase 1 Progress Notes
- [x] **Feature flag & flow switcher:** `CheckoutFlowSwitcher` reads `NEXT_PUBLIC_CHECKOUT_UI` (with query overrides) to choose between the new `HostedCheckoutRedirectView` and the legacy embedded iframe at runtime.
- [x] **Hosted redirect implementation:** The hosted view fetches product metadata, auto-selects default order bumps, calls `/api/checkout/session` with `uiMode: "hosted"`, and redirects users to Stripe. Fallback buttons let QA reopen the embedded experience via `?page=2`.
- [x] **Server-side defaults:** `/api/checkout/session` now auto-populates order bump selection based on product defaults when callers omit the field, ensuring both flows stay in sync.
- [x] **Stripe session options:** Hosted sessions enable customer creation, promotion consent, phone capture, and abandoned-cart recovery (`after_expiration.recovery`). `STRIPE_CHECKOUT_REQUIRE_TOS` now defaults to `true`, so the hosted flow always requires Terms of Service consent; set the variable to `false` only if the Dashboard URLs are unavailable and a deployment must temporarily relax the requirement.
- [x] **Test coverage:** Added a unit test confirming auto-selected order bumps and updated existing assertions for hosted-specific parameters. `pnpm lint`, `pnpm typecheck`, and `pnpm test:unit` execute cleanly.
- [x] **Metadata parity tests:** `tests/api/checkout-consent-metadata.test.ts` now covers hosted `uiMode`, ensuring `checkoutSource`, consent fields, affiliate/order-bump metadata, and DB persistence match the embedded flow.
- [x] **CTA paths normalized:** `checkout.destinations.embedded` defaults to `/checkout?product=…`, and `ClientHomeView` normalizes it to the active origin so preview/staging builds hit the correct deployment without manual edits (see `apps/store/components/home/ClientHomeView.tsx:73`). Hosted is the global default; append `page=2` or set `NEXT_PUBLIC_CHECKOUT_UI=embedded` to exercise the legacy iframe.
- [x] **Checkout destination registry:** Product YAML now stores `checkout.active` with `destinations.{embedded,hosted,ghl}` so we can flip between payment flows via config (`apps/store/data/products/podia-downloader.yaml`, `apps/store/data/products/youtube-downloader.yaml`).
- [x] **Retired legacy CTA field:** All runtime consumers read from `checkout.destinations` / `productToHomeTemplate`. The deprecated `buy_button_destination` property has been removed from the schema and product files.
- [x] **Dynamic pricing display:** Product landing templates read Stripe’s price manifest at runtime (rather than hard-coded strings) and fall back gracefully, so changing amounts in Stripe updates the CTAs automatically.
- [x] **Playwright smoke coverage:** `tests/e2e/checkout-fallback.test.ts` and `tests/manual/checkout-flow.spec.ts` adapt automatically based on `NEXT_PUBLIC_CHECKOUT_UI`, so the suite validates both embedded and hosted modes (including redirect screen and embedded fallback path).
- [x] **Outstanding for rollout:** Documented staging/production runbook; remaining work is executing the checklist (metrics capture, QA rehearsal) before toggling in production.
- **Console/network observations (Preview, 2025‑10‑18):**
  - `https://apps.serp.co/_vercel/insights/script.js` responds 404 with HTML (logged as failed script load + MIME error).
  - Tawk widget repeatedly POSTs `https://va.tawk.to/v1/session/start` and receives `400` responses.
  - Google Pay manifest/icon downloads fail (`https://pay.google.com/gp/p/web_manifest.json`, `https://www.google.com/pay`) producing manifest and icon decode errors.
  - Stripe surfaced warnings about Apple Pay / Amazon Pay configuration being incomplete; determine whether to enable or suppress those handlers before launch.

## Phase 1 Runbook (Staging → Production)
### Pre-flight configuration
1. Stripe Dashboard settings:
   - [x] Add the public Terms of Service and Privacy Policy URLs under [Settings → Branding → Public business information](https://dashboard.stripe.com/settings/public) to satisfy the hosted consent requirement.
   - [x] Keep `STRIPE_CHECKOUT_REQUIRE_TOS` enabled (defaults to `true`); set it to `false` only if a deploy must temporarily bypass the hosted consent gate while the Dashboard URLs are being repaired.
2. Environment variables:
   - [x] Run `pnpm --filter @apps/store validate:env` to confirm required keys (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CHECKOUT_URL`, Stripe secrets) are present; address any errors. _(Script hydrates from repo- and app-level `.env`; optional warnings for analytics/feature flags remain expected.)_ → Last run: 2025‑10‑18 (local + preview configs clean apart from optional warnings).
   - [x] Ensure `NEXT_PUBLIC_CHECKOUT_UI` (or `CHECKOUT_UI`) is left unset/`hosted` by default; set it to `"embedded"` only when you need to pin the legacy iframe for QA or rollback. _(Preview/default env currently leaves the variable unset, which now resolves to hosted.)_
   - [x] Verify `STRIPE_SECRET_KEY`/`STRIPE_SECRET_KEY_TEST` and analytics keys (PostHog, GA) are present in the target environment. _(Confirmed via `vercel env ls`; preview has test+live Stripe keys, staging/production carry live values.)_

### Staging verification checklist
1. [ ] Deploy staging with the default hosted behaviour (no override) and, if helpful, add a query-param banner so QA can append `page=2` or set `NEXT_PUBLIC_CHECKOUT_UI=embedded` to exercise the legacy iframe.
2. [ ] Run automation:
   - [x] `pnpm --filter @apps/store test:smoke` (Playwright MCP); default runs now cover hosted redirect + embedded fallback by forcing `page` parameters. Set `NEXT_PUBLIC_CHECKOUT_UI=embedded` only if you need to pin the iframe for an entire run. _(Last run: 2025‑10‑18 with hosted defaults; 9 tests passed, report under `apps/store/playwright-report/`.)_
   - [x] `pnpm test:unit` and `pnpm typecheck` as part of CI to confirm no regressions slipped in. _(Executed locally 2025‑10‑18; both suites green.)_
3. [ ] Manual QA scenarios:
  - [x] Hit `/checkout?product=youtube-downloader&page=1` to confirm redirect, order-bump defaults, and the hosted Stripe page render cleanly. _(Playwright MCP against the preview build on 2025‑10‑18 surfaced the hosted redirect screen; only console noise was the expected `/ _vercel/insights` 404 + Tawk 400.)_
  - [x] Toggle the fallback button to `/checkout?...&page=2` to verify the iframe still operates. _(Preview logs an expected “Missing Stripe live publishable key” error because the preview env only carries test keys; embedded fallback screen still loads.)_
   - [ ] Exercise at least one product without a bump, and one legacy GHL URL after rewriting its CTA to `/checkout`.
   - [ ] Inspect the stored checkout session (database or recent Stripe session) to confirm metadata keys (`checkoutSource`, `affiliateId`, `orderBump*`, coupon fields) match the embedded flow expectations.
   - [ ] Optional: run `pnpm exec tsx --tsconfig apps/store/tsconfig.json apps/store/scripts/verify-hosted-session.ts` to print hosted session metadata locally for comparison.
4. [ ] Observability:
   - [ ] Watch Stripe logs for webhook processing (`checkout.session.completed`, `checkout.session.expired`).
   - [ ] Use Playwright MCP console + network logs from the smoke suite to verify no new errors appear while the flag is set to `hosted`; manual event checks are optional until analytics coverage improves.

### Production launch & rollback
1. [ ] Freeze window: align stakeholders on launch window and communication to support/marketing.
2. [ ] Ensure `NEXT_PUBLIC_CHECKOUT_UI` remains unset/`hosted` in production and confirm the build still honours `STRIPE_CHECKOUT_REQUIRE_TOS=true`.
3. [ ] Post-launch monitoring:
   - [ ] Track checkout initiation/completion deltas against the baseline metrics gathered above, segmenting by `provider`.
   - [ ] Review Stripe recovery email triggers and ensure they correspond with expected cart numbers; reconcile against internal order/licensing logs until broader analytics are in place.
4. [ ] Rollback procedure:
   - [ ] Reset the flag to `embedded`, redeploy, and clear CDN cache if applicable.
   - [ ] Re-run Playwright smoke tests to confirm the embedded route still passes.


## Risks & Mitigations
- **Loss of custom upsell logic:** Validate hosted line-item approach supports one-click order bump; fallback to `after_completion[redirect]` with upsell page if needed.
- **Analytics disruption:** Coordinate GA/PostHog tag updates prior to rollout; maintain feature flag for quick revert.
- **Compliance for Forwarding:** Requires PCI readiness; treat as optional Phase 2 pilot.
- **Operational readiness:** Train support on new hosted flow, update docs, ensure webhook retries monitored.

## Testing & Monitoring
- Acceptance: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:smoke`.
- Observability: expand `lib/monitoring.ts` checks for hosted session states, add alert when Stripe recovery emails trigger without completion.
- Post-launch dashboards: Stripe analytics + internal `checkout_sessions` table to confirm drop-off improvements.

## Open Questions
1. Should order bump remain within Checkout Session (line item) or move to post-purchase upsell (Stripe Customer Portal or custom page)?
2. Do we need multi-currency support at launch, and if so, are price IDs ready in Stripe?
3. What portion of conversion funnel tracking must remain in GA/PostHog for marketing automation vs. Stripe dashboards?
4. What entitlements schema should we adopt to reconcile Stripe Entitlements with our existing license metadata?
