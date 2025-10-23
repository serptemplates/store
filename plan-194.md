# Issue #194 – Stripe Checkout Decommission & Payment Link Rollout

## Goal Shift
- Deprecate every custom Stripe checkout experience in the store (embedded React flow and hosted-session redirect).
- Replace checkout CTAs with Stripe Payment Links while preserving GHL tagging and fulfilment hooks; defer the analytics rebuild to a separate follow-up once the new checkout path is stable.
- Document the migration path so operations can manage Payment Links from the Stripe dashboard without code deploys.

## Discovery & Constraints
1. **Feature parity requirements**
 - We only need to continue tagging customers in GoHighLevel with the product-specific tag. Confirm we can encode that tag via Payment Link metadata or map it from the product/price in our webhook.
  - Stripe product metadata must include the `ghl_tag` so fulfilment can read it directly; avoid re-introducing affiliate tracking requirements beyond the tag.
  - Stripe-native coupons will be configured in the dashboard; verify promotional codes remain available through the Payment Link UI (no custom coupon logic required).
  - Check entitlement/licensing flows that depend on checkout session metadata (`stripe_checkout_session_id`, `landerId`, etc.) and design an alternative (e.g., webhook enrichment).
  - Validate success/cancel URL customisation, tax behaviour, payment method availability, and multi-currency support.
  - Stripe recommends relying on webhook events and metadata for fulfilment analytics, and redirecting customers back to an owned confirmation page when browser-side tracking (PostHog/GA) is required.
  - Stripe cross-sells are configured at the product level (Dashboard-only today). Confirm whether API support exists before attempting automation; plan for manual configuration if not.
2. **Operational questions**
  - Decide who owns Payment Link creation/maintenance and how link references are stored per product.
  - Preserve existing YAML keys (e.g., `buy_button_destination`) to minimise downstream churn while we wire in Payment Links.
  - Determine if GoHighLevel payment links remain in scope alongside Stripe links.
  - Identify monitoring gaps once API-driven session creation disappears (update LHCI, alerts, dashboards).
3. **Research tasks**
   - Review Stripe docs: Payment Links metadata, checkout custom fields, allowed query parameters.
   - Create a prototype Payment Link and verify the webhook delivers enough information (link id, price ids, metadata) to look up the correct GHL tag in staging.

## Stripe Payment Link Analytics PRD (working draft)
- **Objective**: Preserve accurate conversion tracking while migrating entirely to Stripe Payment Links, following Stripe guidance to combine webhook-driven fulfilment with redirect-based client analytics.
- **Success criteria**
  - Customers are redirected to `/checkout/success` (or successor) after paying so PostHog/legacy analytics fire without manual recreation in Stripe.
  - Webhooks remain the source of truth for fulfilment; metadata (`ghl_tag`, `product_slug`, `payment_link_id`) is available on both the Stripe objects and success-page query params.
  - Stripe Payment Links retain the prescribed configuration (promo codes enabled, no phone/tax ID collection, hosted confirmation disabled in favour of redirect).
  - Documentation clearly states how to regenerate links, sync metadata, and validate analytics instrumentation.
  - Cross-sells (SERP Downloaders Bundle) are configured for sellable products, or the manual runbook is published if Stripe’s API continues to lack support.
- **User flow**
  1. Customer clicks a Payment Link (live/test).
  2. Stripe collects payment details with promo codes enabled, no extra contact fields.
  3. After completion Stripe redirects to `/checkout/success?provider=stripe&payment_link_id=...&slug=...`.
  4. Success page triggers `ConversionTracking`, surfaces receipt messaging, and logs PostHog + any future analytics events using the query params and webhook data.
  5. Webhook handlers persist fulfilment (license, GHL tag) using the Payment Link metadata as the canonical mapping.
- **Open questions**
  - Do we need to include additional identifiers (price_id, product_id) in the redirect query string, or is `payment_link_id` + slug sufficient?
  - Should we maintain a short-lived success cookie/localStorage flag to guard against double-tracking on manual refresh?
  - How will PayPal/GHL flows align with the Stripe redirect experience for analytics parity?
  - Stripe’s cross-sell management is currently dashboard-only per docs. If the API becomes available, update automation; otherwise document the manual steps.


## Audit – Embedded Checkout References
- [x] `apps/store/tests/lib/product-adapter.test.ts` – updated assertions now exercise the Payment Link CTA resolver.
- [x] `scripts/monitoring/create-checkout-fallback-alert.ts` – rewrite insight for “payment link unavailable” vs. embedded fallback.
- [x] `apps/store/__tests__/useCheckoutRedirect.test.tsx` – removed alongside the legacy hook.
- [x] Confirm marketing copy in `apps/store/data/products/*.yaml` no longer mentions “embedded checkout” (spot-check complete).
- [x] Update docs referencing embedded/legacy language:
  - [x] `docs/upsell-regression-checklist.md`
  - [x] `docs/architecture/checkout-overview.md`
  - [x] `docs/architecture/payments-stripe-webhook.md`
  - [x] `docs/checkout-cross-sell-setup.md`
  - [x] `docs/operations/pre-release-cta.md`
  - [x] `docs/architecture/component-organization.md`

## Audit – Hosted Checkout Dependencies
- [x] `apps/store/components/product/useCheckoutRedirect.ts`
- [x] `apps/store/app/api/checkout/session/route.ts` (creates hosted sessions).
- [x] `apps/store/app/checkout/page.tsx` (server redirect).
- [x] CTA wiring in UI views: `apps/store/components/home/ClientHomeView.tsx`, `apps/store/components/product/StickyPurchaseBar.tsx`, hybrid layouts, etc.
- [x] Audit `/checkout/(cancel|success)` routes to ensure they no longer depend on hosted session metadata.
- [x] Tests relying on Stripe session creation:
  - [x] `apps/store/tests/api/checkout-session.test.ts`
  - [x] `apps/store/tests/content/price-manifest.test.ts` (ensures price mapping)
  - [x] `apps/store/tests/api/paypal-*` (share metadata expectations)
- [x] Docs referencing hosted checkout:
  - [x] `docs/architecture/checkout-overview.md`
  - [x] `docs/historical/store-cutover.md`
  - [x] `docs/operations/store-deployment.md`
  - [x] `docs/upsell-smoke-tests.md`
- [x] Monitoring/ops scripts expecting hosted checkout telemetry.

## Implementation Roadmap

### Phase 0 – Validation & Alignment
 - [x] Confirm Payment Links carry or expose identifiers needed to apply the correct GHL tag post-purchase (link metadata or price mapping).
 - [x] Document any blockers or required Stripe feature flags and escalate decisions. _(No blockers. Payment Links run without feature flags per `docs/operations/stripe-payment-links.md`.)_
 - [x] Align stakeholders on PayPal support strategy and operational ownership of Payment Links. _(Operational expectations captured in `docs/operations/stripe-payment-links.md` under Operational Assumptions.)_
 - [x] Capture assumptions about coupons, success URLs, and entitlement flow in the project brief. _(See Operational Assumptions in `docs/operations/stripe-payment-links.md`.)_

### Phase 1 – Data Model & Configuration
 - [x] Extend the product schema to store Payment Link URLs/ids (including test vs live variants).
 - [x] Update validation logic to require a Payment Link (Stripe or GHL) for any sellable product.
- [x] Add scripting to apply GHL tags to Stripe product metadata automatically. _(Script now syncs both Stripe product + price metadata via `apps/store/scripts/update-stripe-product-tags.ts`.)_
- [x] Build tooling or scripts to sync link references from Stripe into product YAML. _(Implemented `apps/store/scripts/create-stripe-payment-links.ts`; writes `docs/operations/stripe-payment-links.md` for auditing.)_
- [x] Define and implement fallback behaviours (e.g., missing Payment Link -> waitlist modal).
 - [x] Update developer documentation describing how to register new Payment Links. _(Developer Runbook added to `docs/operations/stripe-payment-links.md`.)_
- [x] Configure Stripe cross-sell for each product to offer the SERP Downloaders Bundle (Dashboard workflow until API support exists); capture instructions for ops. _(Completed via Stripe dashboard sweep on 2025-10-22; bundle now present on all active downloader products.)_

### Phase 2 – Frontend Migration
- [x] Introduce a shared helper (hook or util) that resolves the correct Payment Link URL (Stripe test vs live, or GHL) and records the click source.
- [x] Replace `useCheckoutRedirect` usage in `ClientHomeView`, `StickyPurchaseBar`, product cards, primary navigation, and any CTA composites.
- [x] Remove `/checkout` route and ensure legacy deep links redirect to product pricing or the waitlist when necessary.
- [x] Delete `useCheckoutRedirect` tests and add coverage for the new helper + CTA wiring.
- [x] Retain minimal CTA click tracking and capture the Payment Link id/source alongside the product slug.
- [x] QA the waitlist modal and non-checkout CTAs to ensure no regressions.
- [x] Remove legacy `cta_mode` handling; rely on `payment_link` and `status` for CTA resolution.
- [x] Configure Payment Link generation/sync to redirect back to `/checkout/success` with analytics query params (`payment_link_id`, `provider`, `slug`) so client-side tracking continues to fire.
- [x] Update `/checkout/success` to read the new query params, hydrate `ConversionTracking`, and guard against double-firing on refresh (e.g., idempotent storage or `history.replaceState`).
- [x] Add Stripe hosted-confirmation cross-sell messaging pointing to the SERP Downloaders Bundle (`apps/store/scripts/sync-stripe-payment-links.ts`).

### Phase 3 – Backend & Integrations
- [x] Decommission `apps/store/app/api/checkout/session/route.ts` and supporting libs/tests.
- [x] Update webhook handlers to map Payment Link or price identifiers to the correct GHL tag and fulfilment payload. _(Ensure webhook fallbacks read `metadata.ghl_tag` or map the Payment Link id.)_
- [x] Verify licence fulfilment and reporting still receive the required data without per-session metadata.
- [x] Refresh monitoring scripts/alerts to observe Payment Link success/cancel metrics instead of hosted sessions.
- [x] Clean up any unused environment variables related to hosted checkout sessions. _(Removed `STRIPE_CHECKOUT_PAYMENT_METHODS` usage in code and earmarked `NEXT_PUBLIC_CHECKOUT_URL`/PayPal keys for environment pruning in deployment runbooks.)_
- [x] Emit analytics/webhook logs capturing `payment_link_id`, `ghl_tag`, and `product_slug`, and pipe those into the reporting layer so redirect + webhook data stays reconciled.
- [x] Preserve historical GHL purchase metadata by appending new purchases under `previousPurchases[]` instead of overwriting the existing JSON blob. _(Docs updated in `docs/architecture/GHL-INTEGRATION-STATUS.md` and `docs/operations/store-deployment.md`.)_
- [x] Require Terms of Service consent on every Payment Link (`consent_collection.terms_of_service = required`) and persist the acceptance flag via webhook/success-page metadata so GHL receives `tosAccepted` for each order. _(New links are provisioned with the checkbox automatically; existing links still need a one-time manual toggle if Stripe rejects the API update.)_

### Phase 4 – Content & Documentation Cleanup
- [x] Update docs/checklists (`docs/architecture/*`, `operations/*`, playbooks) to describe Payment Links. _(Fold in the `stripe:create-payment-links` runbook and link to `docs/operations/stripe-payment-links.md`.)_
- [x] Refresh marketing copy in product YAMLs/blog posts that reference embedded or hosted checkout. _(Audited `apps/store/data/products/*.yaml` and supporting content; no remaining references were found.)_
 - [x] Remove or rewrite manual QA scripts and test fixtures tied to the old flows. _(Updated `inspect_checkout.py` and `test_checkout_with_playwright.py` to validate Stripe Payment Links.)_
 - [x] Notify support/sales enablement teams of the new checkout experience. _(Added enablement guidance to `docs/operations/README.md`.)_
- [x] Document the analytics redirect contract (required query params, success-page responsibilities, webhook correlation) so ops/dev know how to validate conversions.
- [x] Expand automated coverage for Payment Link redirects/TOS metadata (`apps/store/tests/lib/payment-link-config.test.ts`, `apps/store/tests/lib/payment-link.test.ts`). _(Legacy E2E stripe checkout smoke was removed after CTA flow stabilised; unit coverage + manual staging check now cover regressions.)_

### Phase 6 – PayPal Decommission Checklist
- [x] **Environment & build configuration**
  - [x] `.env` – remove all `PAYPAL_*` secrets/IDs and `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
  - [x] `apps/store/package.json` – drop PayPal dependencies (`@paypal/*` packages).
  - [x] `apps/store/next.config.mjs` – remove PayPal entries from the transpile/warning lists.
  - [x] `apps/store/app/layout.tsx` – delete the PayPal DNS prefetch.
- [x] **API routes & health checks**
  - [x] `apps/store/app/api/paypal/create-order/route.ts`
  - [x] `apps/store/app/api/paypal/capture-order/route.ts`
  - [x] `apps/store/app/api/paypal/webhook/route.ts`
  - [x] `apps/store/app/api/health/route.ts` – strip PayPal configuration reporting.
- [x] **Checkout success handling**
  - [x] `apps/store/app/checkout/success/SuccessContent.tsx`
  - [x] `apps/store/app/checkout/success/actions.ts`
  - [x] `apps/store/app/checkout/success/tracking.tsx`
- [x] **Frontend components**
  - [x] `apps/store/components/paypal-button.tsx`
  - [x] `apps/store/components/account/AccountDashboard.tsx` – remove PayPal-specific status handling.
- [x] **Payment & analytics libraries**
  - [x] `apps/store/lib/payments/paypal.ts`
  - [x] `apps/store/lib/analytics/checkout.ts`
  - [x] `apps/store/lib/analytics/checkout-server.ts`
  - [x] `apps/store/lib/validation/checkout.ts`
  - [x] `apps/store/lib/env-validation.ts`
  - [x] `apps/store/lib/ghl-client/sync.ts`
- [x] **Checkout persistence**
  - [x] `apps/store/lib/checkout/orders.ts`
  - [x] `apps/store/lib/checkout/types.ts`
  - [x] `apps/store/lib/database.ts` – update enums/check constraints that reference `paypal`.
- [x] **Shared contracts**
  - [x] `apps/store/lib/contracts/checkout.contract.ts`
  - [x] `apps/store/lib/contracts/database.contract.ts`
  - [x] `apps/store/lib/contracts/payment.contract.ts`
  - [x] `apps/store/lib/contracts/validation.middleware.ts`
  - [x] `apps/store/types/paypal.d.ts`
  - [x] `apps/store/__tests__/contracts.test.ts` (remove PayPal fixtures).
- [x] **Scripts & tooling**
  - [x] `apps/store/scripts/manual-tests/automated-payment-test.ts`
  - [x] `apps/store/scripts/manual-tests/test-payment-flow.ts`
  - [x] `apps/store/scripts/manual-tests/inspect_checkout.py`
  - [x] `apps/store/scripts/manual-tests/test_checkout_with_playwright.py`
  - [x] Any other helper mentioning PayPal (grep to confirm once deletions begin).
- [x] **Tests**
  - [x] `apps/store/tests/api/paypal-create-order.test.ts`
  - [x] `apps/store/tests/api/paypal-capture-order.test.ts`
  - [x] `apps/store/tests/api/paypal-webhook.test.ts`
  - [x] `apps/store/tests/app/checkout/success/actions.paypal.test.ts`
  - [x] `apps/store/tests/integration/paypal-ghl-flow.test.ts`
  - [x] `apps/store/tests/checkout/rate-limit.test.ts` – remove PayPal cases.
  - [x] Any PayPal branches in other suites (e.g., analytics/contracts tests).
- [x] **Documentation**
  - [x] `docs/architecture/checkout-overview.md`
  - [x] `docs/architecture/GHL-INTEGRATION-STATUS.md`
  - [x] `docs/operations/PAYPAL-SETUP.md`
  - [x] `docs/operations/store-deployment.md`
  - [x] `docs/operations/stripe-payment-links.md` (update assumptions).
  - [x] `docs/operations/vercel-envs.md`
  - [x] Historical/security/checklist docs that reference PayPal (see `docs/upsell-*`, `docs/security/*`, `docs/historical/*`). _(Annotated remaining mentions as legacy-only guidance for auditors.)_

### Phase 5 – QA & Rollout
- [x] Finalise regression plan.
  - Automated: `pnpm lint`, `pnpm typecheck`, `pnpm --filter @apps/store test:unit`, `pnpm --filter @apps/store test:e2e`, `pnpm --filter @apps/store test:smoke`, and `pnpm --filter @apps/store validate:products` must pass on every deploy candidate.
  - Stripe CLI smoke: `stripe listen --forward-to http://localhost:3000/api/stripe/webhook --api-key $STRIPE_SECRET_KEY_TEST` while running a local Payment Link checkout to ensure webhook and GHL tagging behave in test mode.
  - Manual spot-check: in staging, open three representative product CTAs (standard, pre-release, bundle) to ensure Payment Link, waitlist modal, and upsell copy render correctly.
- [x] Execute manual staging walkthrough and capture notes.
  - Checklist (staging): verify Payment Link opens with SERP Downloaders Bundle recommendation, confirm promo-code `TEST20` applies 20% discount, assert TOS checkbox is required, and confirm the waitlist modal fires for pre-release slugs.
  - Record screenshots of Stripe Checkout (order summary + cross-sell) and `/checkout/success` with tracking banner for Ops rundown.
- [x] Monitor Stripe dashboards/webhooks post-launch.
  - Enable Stripe Dashboard alerts for failed payments and webhook retries (`Developers → Events → Add alert`).
  - Use `docs/operations/store-post-launch-monitoring.md` Section 5 for Payment Link specific checks (success redirect rate, webhook error histogram, ops Slack alerts).
  - Review Vercel log drain (or `vercel logs apps.serp.co --since 1h`) for `event=checkout.session.completed` entries to confirm metadata enrichment continues.
- [x] Prepare documented rollback plan.
  - Preserve the `main@8131019` deployment as the last hosted-checkout build; note the Vercel deployment ID in release notes.
  - Rollback steps: `git checkout main@8131019`, `pnpm install`, redeploy via Vercel CLI, and run `pnpm --filter @apps/store stripe:sync-payment-links` to republish legacy link metadata.
  - Maintain the Stripe Payment Link tables (`docs/operations/stripe-payment-links.md`) so Ops can swap URLs if a rapid rollback is required without code change.
- [x] Schedule post-launch review.
  - Within 48 hours of launch, host a review with Engineering + Marketing to confirm analytics deltas, coupon usage, and customer support feedback.

### Phase 7 – Repo Cleanup Inventory (new)

_Objective: catalogue dormant UI and route code so we can schedule removal passes without surprising dependents._

- **Unused React UI (no inbound references via `rg` / `ts-prune`)**
  - [x] `apps/store/components/ConversionAudit.tsx`
  - [x] `apps/store/components/FAQ.tsx`
  - [x] `apps/store/components/Hero.tsx`
  - [x] `apps/store/components/SocialProof.tsx`
  - [x] `apps/store/components/waitlist-form.tsx`
  - [x] `apps/store/components/analytics/analytics-provider.tsx`
  - [x] `apps/store/components/analytics/gtm.tsx` (`useAnalytics` hook + context never consumed; only `DelayedGTM` remains active)
  - [x] `apps/store/components/shop/product-grid.tsx`
- **Alternative product hero layouts (not imported by the dynamic `[slug]` page)**
  - [x] `apps/store/app/[slug]/apple-style-hero.tsx`
  - [x] `apps/store/app/[slug]/flowbite-style-hero.tsx`
  - [x] `apps/store/app/[slug]/nike-style-hero.tsx`
- **Static config that no longer drives behaviour**
  - [ ] `apps/store/lib/feature-flags.ts` (`SHOP_ENABLED` hard-coded to `false`, never referenced after storefront rewrite)
- **Design-system surface check**
  - [ ] `packages/ui/src/index.ts` re-exports (large portion unused inside `apps/store`; confirm other workspaces don’t rely on them before pruning or split into per-app entrypoints).
- **Legacy scripts & data artifacts**
  - [x] `apps/store/demo-checkout-fix.js` (removed; checkout duplication scenario now documented elsewhere)
  - [x] `apps/store/data/ghl-payment-links.json` (removed; superseded by product YAML payment_link entries)
  - [ ] `apps/store/data/team.ts` (still used by home/product pages—keep synced if content shifts)
- **Remote product assets**
  - [ ] Migrate product imagery away from `raw.githubusercontent.com/serpapps/...` URLs (see `docs/operations/repo-cleanup-inventory.md` §7 for affected slugs and migration options).
- **Documentation follow-up**
  - [ ] Add explicit note in `docs/operations/store-deployment.md` (or new cleanup doc) when each of the above files is deleted so ops know the alternate UIs/flows are gone. _(Tracking doc: `docs/operations/repo-cleanup-inventory.md`.)_
  - Capture follow-up tickets for the analytics rebuild (PostHog schema, success-page enhancements) and track under a new issue.
- [x] Validate redirect analytics.
  - Procedure: staging deploy + Stripe test mode → run `stripe listen` with fresh `whsec`, complete a Payment Link checkout, confirm `/checkout/success` emits PostHog `checkout:completed` once, and verify webhook logs show appended GHL metadata without overwriting existing fields.
  - Document result in `docs/operations/stripe-payment-links.md` under “Analytics validation” for future audits.

## Open Questions / Risks
- **GHL tagging**: confirm whether Payment Link metadata can hold the tag outright or if we must map price/link ids to tags in code.
- **Success experience**: Payment Links redirect to configured URLs. Do we need per-product success URLs or can the existing generic success page handle fulfilment?
- **Analytics follow-up**: define scope for the post-migration analytics rebuild (event model, tooling) and ensure work is tracked separately.
- **Pricing sync**: Payment Links lock price IDs at creation time. Define process for keeping them aligned with catalog updates.

## Immediate Next Steps
- [x] Prototype Payment Link creation via Stripe API/manual dashboard; document how to recover the correct GHL tag from webhook payloads. _(Automated via `apps/store/scripts/create-stripe-payment-links.ts`, populating product YAML and metadata.)_
  - [x] Reactivate or replace the archived Stripe prices causing automation skips, then rerun the script to refresh `docs/operations/stripe-payment-links.md`:
    - [x] `amazon-video-downloader`
    - [x] `beeg-video-downloader`
    - [x] `xnxx-video-downloader`
- [x] Document the new Payment Link automation in developer onboarding guides (command usage, expected log output, troubleshooting archived prices). _(See Developer Runbook in `docs/operations/stripe-payment-links.md`.)_
- [x] Draft schema changes for storing payment link references and circulate for review.
- [x] Summarise findings for stakeholders and confirm go/no-go before deleting hosted checkout code. _(Stakeholder Summary added to `docs/operations/stripe-payment-links.md`.)_
- [x] Finalise webhook + fulfilment validation plan to ensure GHL tagging still works with Payment Link metadata as the source of truth. _(Fulfilment Validation Plan documented in `docs/operations/stripe-payment-links.md`.)_
- [x] Implement the shared Payment Link navigation helper and update `ClientHomeView` to use it.
- [x] Remove the `/checkout` page while preserving redirects for old URLs.
- [x] Decommission `app/api/checkout/session/route.ts` and update `/checkout/{success,cancel}` flows to rely on Payment Link metadata.
- [x] Update docs (`checkout-overview.md`, `component-organization.md`, `upsell-regression-checklist.md`, `payments-stripe-webhook.md`) to reference `useProductCheckoutCta` and the Payment Link flow.
- [x] Replace the embedded-checkout PostHog insight (`scripts/monitoring/create-checkout-fallback-alert.ts`) with Payment Link availability monitoring.
- [x] Align Payment Link creation + sync scripts with the analytics PRD (redirect back to `/checkout/success`, append query params, ensure metadata parity) and roll the changes out to staging/production links. _(Handled in `apps/store/scripts/create-stripe-payment-links.ts` and `apps/store/scripts/sync-stripe-payment-links.ts`.)_
- [x] Update `/checkout/success` instrumentation to consume redirect parameters, hydrate `ConversionTracking`, and avoid duplicate firing on refresh. _(See `apps/store/app/checkout/success/SuccessContent.tsx` & `tracking.tsx`.)_
