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
   - Add a hosted redirect surface that lives alongside the current embedded page. The product CTA uses `useCheckoutRedirect` (`apps/store/components/product/useCheckoutRedirect.ts:1`) to call `/api/checkout/session` requesting `uiMode: "hosted"` whenever the new env flag (for example, `NEXT_PUBLIC_CHECKOUT_UI=hosted`) is active; otherwise it stays on the embedded path.
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
   1. Add `NEXT_PUBLIC_CHECKOUT_UI` (and server-side twin if needed) defaulting to `embedded`.
   2. Update `useCheckoutRedirect` and server handlers to branch on the flag and request hosted sessions when set to `hosted`.
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
- **Product inventory:** 95 product definitions under `apps/store/data/products`. 28 attach the `serp-downloaders-bundle` order bump; the rest either omit the field or leave it blank (treat as “no bump” today). Automated summary script lives in this spec’s history.
- **Current destinations:** 49 products still point their `buy_button_destination` at `https://ghl.serp.co/...`; we’ll need to migrate those CTAs to `/checkout` once the hosted flow is ready.
- **Stripe pricing coverage:** Every product declares a live `stripe.price_id`. None currently specify `stripe.test_price_id`; our existing Stripe helper clones live prices when the test key is present, so we must ensure `STRIPE_SECRET_KEY_TEST` is populated before QA can hit hosted Checkout in test mode.
- **Env variables:** Key requirements gathered so far — `STRIPE_SECRET_KEY`, `STRIPE_SECRET_KEY_TEST`, `NEXT_PUBLIC_SITE_URL`, analytics keys (PostHog, GA). Need confirmation of staging/production parity and documentation of where each is sourced (.env, Vercel envs, etc.).
- **Metrics baseline:** Pending stakeholder sync; current plan is to capture conversion (product page → checkout), completion, and recovery rates before flipping the flag.
- **Compliance notes:** Stripe Forwarding and Entitlements remain optional; legal/compliance review still needed before we commit to those later phases.

## Phase 1 Progress Notes
- **Feature flag & flow switcher:** `CheckoutFlowSwitcher` reads `NEXT_PUBLIC_CHECKOUT_UI` (with query overrides) to choose between the new `HostedCheckoutRedirectView` and the legacy embedded iframe at runtime.
- **Hosted redirect implementation:** The hosted view fetches product metadata, auto-selects default order bumps, calls `/api/checkout/session` with `uiMode: "hosted"`, and redirects users to Stripe. Fallback buttons let QA reopen the embedded experience via `?ui=embedded`.
- **Server-side defaults:** `/api/checkout/session` now auto-populates order bump selection based on product defaults when callers omit the field, ensuring both flows stay in sync.
- **Stripe session options:** Hosted sessions enable customer creation, promotion consent, phone capture, and abandoned-cart recovery (`after_expiration.recovery`). Leave `STRIPE_CHECKOUT_REQUIRE_TOS` unset/false until the Stripe Dashboard Terms of Service URL is configured, otherwise Stripe surfaces a consent error during redirect.
- **Test coverage:** Added a unit test confirming auto-selected order bumps and updated existing assertions for hosted-specific parameters. `pnpm lint`, `pnpm typecheck`, and `pnpm test:unit` execute cleanly.
- **Outstanding for rollout:** document staging flag flip procedure, capture baseline metrics, and rehearse manual QA scenarios (hosted vs embedded) before toggling in production.

## Phase 1 Runbook (Staging → Production)
### Pre-flight configuration
1. Stripe Dashboard settings:
   - Add the public Terms of Service and Privacy Policy URLs under [Settings → Branding → Public business information](https://dashboard.stripe.com/settings/public) to satisfy the hosted consent requirement.
   - Only set `STRIPE_CHECKOUT_REQUIRE_TOS=true` after those URLs exist; otherwise Stripe blocks the session with `You cannot collect consent to your terms of service unless a URL is set`.
2. Environment variables:
   - Ensure `NEXT_PUBLIC_CHECKOUT_UI` (or `CHECKOUT_UI`) is `embedded` by default; stage overrides happen via deployment config.
   - Verify `STRIPE_SECRET_KEY`/`STRIPE_SECRET_KEY_TEST` and analytics keys (PostHog, GA) are present in the target environment.
3. Baseline metrics capture:
   - Pull the last 30 days of product page → checkout conversion, checkout completion, and recovery rates (abandoned cart emails) so we can compare post-rollout.

### Staging verification checklist
1. Deploy staging with `NEXT_PUBLIC_CHECKOUT_UI=hosted` and (optionally) a query-param override banner so QA can jump between modes.
2. Run automation:
   - `pnpm --filter @apps/store test:smoke` (Playwright MCP) with the flag both `hosted` and `embedded`.
   - `pnpm test:unit` and `pnpm typecheck` as part of CI to confirm no regressions slipped in.
3. Manual QA scenarios:
   - Hit `/checkout?product=youtube-downloader&ui=hosted` to confirm redirect, order-bump defaults, and the hosted Stripe page render cleanly.
   - Toggle the fallback button to `/checkout?...&ui=embedded` to verify the iframe still operates.
   - Exercise at least one product without a bump, and one legacy GHL URL after rewriting its CTA to `/checkout`.
4. Observability:
   - Watch Stripe logs for webhook processing (`checkout.session.completed`, `checkout.session.expired`).
   - Confirm analytics events emit in both modes.

### Production launch & rollback
1. Freeze window: align stakeholders on launch window and communication to support/marketing.
2. Flip `NEXT_PUBLIC_CHECKOUT_UI=hosted` (and any server-side twin) via config deploy; verify the build picks up `STRIPE_CHECKOUT_REQUIRE_TOS` only if the Dashboard URLs are live.
3. Post-launch monitoring:
   - Track checkout initiation/completion deltas against the baseline metrics gathered above.
   - Review Stripe recovery email triggers and ensure they correspond with expected cart numbers.
4. Rollback procedure:
   - Reset the flag to `embedded`, redeploy, and clear CDN cache if applicable.
   - Re-run Playwright smoke tests to confirm the embedded route still passes.


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
