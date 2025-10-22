# Issue #194 – Stripe Checkout Decommission & Payment Link Rollout

## Goal Shift
- Deprecate every custom Stripe checkout experience in the store (embedded React flow and hosted-session redirect).
- Replace checkout CTAs with Stripe Payment Links while preserving GHL tagging and fulfilment hooks; defer the analytics rebuild to a separate follow-up once the new checkout path is stable.
- Document the migration path so operations can manage Payment Links from the Stripe dashboard without code deploys.

## Discovery & Constraints
1. **Feature parity requirements**
   - We only need to continue tagging customers in GoHighLevel with the product-specific tag. Confirm we can encode that tag via Payment Link metadata or map it from the product/price in our webhook.
   - Stripe-native coupons will be configured in the dashboard; verify promotional codes remain available through the Payment Link UI (no custom coupon logic required).
   - Check entitlement/licensing flows that depend on checkout session metadata (`stripe_checkout_session_id`, `landerId`, etc.) and design an alternative (e.g., webhook enrichment).
   - Validate success/cancel URL customisation, tax behaviour, payment method availability, and multi-currency support.
2. **Operational questions**
   - Decide who owns Payment Link creation/maintenance and how link IDs will be stored per product (likely in product YAML).
   - Determine if PayPal remains in scope. If yes, Payment Links may require parallel PayPal handling or a composite landing experience.
   - Identify monitoring gaps once API-driven session creation disappears (update LHCI, alerts, dashboards).
3. **Research tasks**
   - Review Stripe docs: Payment Links metadata, checkout custom fields, allowed query parameters.
   - Create a prototype Payment Link and verify the webhook delivers enough information (link id, price ids, metadata) to look up the correct GHL tag in staging.

## Audit – Embedded Checkout References
- **Code/tests**
  - `apps/store/tests/lib/product-adapter.test.ts` (embedded CTA expectations).
  - `scripts/monitoring/create-checkout-fallback-alert.ts` (refers to embedded fallback insight).
  - `apps/store/__tests__/useCheckoutRedirect.test.tsx` still models hosted redirect but implicitly replaces embedded flow.
- **Product content**
  - Multiple YAMLs in `apps/store/data/products/*.yaml` contain marketing copy mentioning “embedded checkout” (e.g., `redgifs-downloader.yaml`, `stream-downloader.yaml`, `gohighlevel-downloader.yaml`). These need rewritten messaging once the flow changes.
- **Docs**
  - `docs/upsell-regression-checklist.md`
  - `docs/architecture/checkout-overview.md`
  - `docs/architecture/payments-stripe-webhook.md`
  - `docs/checkout-cross-sell-setup.md`
  - `docs/operations/pre-release-cta.md`

## Audit – Hosted Checkout Dependencies
- `apps/store/components/product/useCheckoutRedirect.ts`
- `apps/store/app/api/checkout/session/route.ts` (creates hosted sessions).
- `apps/store/app/checkout/page.tsx` (server redirect).
- CTA wiring in UI views: `apps/store/components/home/ClientHomeView.tsx`, `apps/store/components/product/StickyPurchaseBar.tsx`, hybrid layouts, etc.
- Tests relying on Stripe session creation: 
  - `apps/store/tests/api/checkout-session.test.ts`
  - `apps/store/tests/content/price-manifest.test.ts` (ensures price mapping)
  - `apps/store/tests/api/paypal-*` (share metadata expectations)
- Docs referencing hosted checkout: 
  - `docs/architecture/checkout-overview.md`
  - `docs/historical/store-cutover.md`
  - `docs/operations/store-deployment.md`
  - `docs/upsell-smoke-tests.md`
- Monitoring/ops scripts expecting hosted checkout telemetry.

## Implementation Roadmap

### Phase 0 – Validation & Alignment
- Confirm Payment Links carry or expose the identifiers we need to apply the correct GHL tag post-purchase (link metadata or price mapping).
- Document blockers or required Stripe feature flags; escalate if Payment Links cannot support a requirement.
- Align stakeholders on PayPal support strategy and operational ownership of Payment Links.

### Phase 1 – Data Model & Configuration
- Extend product schema to store Payment Link URLs/ids (including test vs live variants).
- Build tooling or scripts to sync link references from Stripe into product YAML.
- Define fallback behaviours (e.g., missing Payment Link = waitlist modal).

### Phase 2 – Frontend Migration
- Replace `useCheckoutRedirect` with a direct navigation helper that routes shoppers to the appropriate Payment Link (test vs live).
- Remove `/checkout` route entirely; update any deep links to redirect straight to the Payment Link or to the product page when the link is missing.
- Capture minimal CTA click events for parity, with a full analytics redesign tracked separately.
- Update sticky bars, pricing components, and nav CTAs to use the Payment Link lookup.

### Phase 3 – Backend & Integrations
- Decommission `apps/store/app/api/checkout/session/route.ts` and supporting libs/tests.
- Update webhook handlers so `checkout.session.completed` events triggered by Payment Links map back to the product and apply the correct GHL tag (e.g., look up by link id or price id).
- Ensure existing licence fulfilment and reporting code paths work when session metadata is limited to static Payment Link fields.
- Adjust monitoring scripts and alerts to observe Payment Link performance instead of hosted sessions.

### Phase 4 – Content & Documentation Cleanup
- Update all docs/checklists to describe Payment Links.
- Refresh marketing copy in product YAMLs and blog posts referencing embedded/hosted checkout.
- Remove obsolete test fixtures and manual runbooks tied to the old flows.

### Phase 5 – QA & Rollout
- Regression plan: run existing automated suites, plus manual validation clicking each Payment Link in staging (Stripe promotions, waitlist fallback).
- Monitor Stripe dashboards/webhooks post-launch for anomalies.
- Prepare a rollback plan (e.g., keep hosted session code in a feature flag until Payment Links validated).

## Open Questions / Risks
- **GHL tagging**: confirm whether Payment Link metadata can hold the tag outright or if we must map price/link ids to tags in code.
- **Success experience**: Payment Links redirect to configured URLs. Do we need per-product success URLs or can the existing generic success page handle fulfilment?
- **Analytics follow-up**: define scope for the post-migration analytics rebuild (event model, tooling) and ensure work is tracked separately.
- **Pricing sync**: Payment Links lock price IDs at creation time. Define process for keeping them aligned with catalog updates.

## Immediate Next Steps
1. Prototype Payment Link creation via Stripe API/manual dashboard; document how to recover the correct GHL tag from webhook payloads.
2. Draft schema changes for storing payment link references.
3. Summarise findings for stakeholders and confirm go/no-go before deleting hosted checkout code.
