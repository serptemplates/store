# Order Bump Rollout Plan

## Context
- Working branch: `order-bump` (diverged from `product-yamls` after checkout refactors).
- Goal: ship a reusable order bump upsell across product landers and checkout (Stripe + PayPal) without regressing the newly generated product YAML workflow.

## Completed So Far
- Pricing CTA and checkout UI render optional order bumps (see `packages/ui/src/sections/PricingCta.tsx`, `apps/store/components/checkout/EmbeddedCheckoutView.tsx`).
- Backend plumbing passes order bump selections through checkout session creation, PayPal orders, metadata storage, and analytics hooks.
- Product adapter maps `order_bump` metadata from YAML into the home template and checkout payloads.
- Unit, lint, and typecheck suites are green on the branch (`pnpm lint`, `pnpm typecheck`, `pnpm test:unit`).

## Outstanding Work

### 1. Align With `product-yamls` Base
- [ ] Reintroduce `order_bump` and `pricing.subheading` support into the shared schemas removed on `product-yamls` (`apps/store/lib/products/product-schema.ts`, `apps/store/data/product.schema.json`, `apps/store/scripts/validate-products.ts`, `apps/store/tests/lib/product-schema.test.ts`).
- [ ] Keep `/api/checkout/products/[slug]/route.ts` (currently deleted on `product-yamls`) or port its logic into the new checkout flow before rebasing.
- [ ] Audit other files touched in both branches (see `git diff order-bump..product-yamls`) and queue merge notes so the upsell logic survives the sync.

### 2. Payment Provider Setup
- [x] Document the Stripe-side assets required for each upsell (product + price IDs, test mode parity) and optionally script creation to avoid manual dashboards.
- [x] Confirm whether PayPal needs a distinct product/item definition for the upsell and add setup steps if so.
- [x] Extend the generator or onboarding checklist so new upsells create both live and test Stripe price IDs before deployment.

### 3. Content & Data Pipeline
- [x] Extend the YAML product generator/validation docs so content editors know how to populate `order_bump` blocks (IDs, copy, Stripe price IDs, default selection flags).
- [x] Backfill at least one product YAML with real order bump content (`apps/store/data/products/*.yaml`) to exercise the pipeline end-to-end.
- [x] Ensure `scripts/validate-products.ts` surfaces actionable errors when order bump definitions are incomplete (e.g., missing Stripe price ID).
- [x] Evaluate referencing an existing product slug for upsells (cross-sell model) instead of duplicating data; document pros/cons and, if adopted, update schema/supporting code to resolve a secondary product definition at runtime.

### 4. Checkout & Payments
- [x] Stripe: confirm `apps/store/lib/checkout/session/pricing.ts` persists the correct unit amounts and promotion codes when an order bump is selected alongside coupons.
- [x] PayPal: validate `apps/store/app/api/paypal/create-order/route.ts` mirrors Stripe behaviour (metadata, totals, coupon math, order bump price caps).
- [x] Embedded checkout: add optimistic UI feedback when toggling the order bump (loading/disabled states during session regeneration).
- [x] Post-purchase: verify receipt/fulfilment services can distinguish the upsell via stored metadata (e.g., licensing, email receipts).

### 5. Multi-Upsell Flexibility
- [ ] Decide on naming (“upsell”, “bundle”, etc.) and data model to support more than one add-on (array of upsells vs. single block).
- [ ] Update product schema/types (`product-schema.ts`, `PricingCtaProps`, checkout types) to accept a list of upsell offers while maintaining backwards compatibility with a single entry.
- [ ] Design UI patterns for multiple upsells (stacked cards, carousel, or modal) on both the lander Pricing CTA and checkout flows.
- [ ] Ensure checkout APIs and metadata can capture multiple selections and aggregate pricing correctly.

### 6. Analytics & Tracking
- [ ] Instrument explicit order bump selection events (GA/PostHog) in `EmbeddedCheckoutView` to observe attach rates.
- [ ] Confirm metadata emitted to Segment/PostHog is documented downstream so dashboards can segment by order bump uptake.

### 7. Regression Safeguards
- [x] Treat schema, checkout, and template changes as shared-surface updates; expand unit/integration coverage to assert legacy “no upsell” flows still pass.
- [x] Add checkout smoke tests (Stripe + PayPal) for both upsell-selected and upsell-cleared paths; confirm totals, metadata, and coupons match current behaviour.
- [ ] Validate a representative lander without upsells after each change to ensure default Pricing CTA layouts still render.
- [ ] Sanity-check analytics payloads to avoid duplicate events or unexpected properties in downstream dashboards/automations.

### 7. Frontend Polish
- [ ] Review responsive layout of the new Pricing CTA two-column card with design (especially `lg` breakpoints and mobile stacking).
- [ ] Swap placeholder copy (e.g., “300 critical conversion checkpoints”) for dynamic content or remove if unnecessary.
- [ ] Consider progressive enhancement: hide the order bump panel entirely when data is missing rather than rendering empty shells.

### 8. QA & Release
- [ ] Add targeted tests for order bump flows (Stripe + PayPal + metadata persistence) in `apps/store/tests/api` and component tests for the CTA toggle.
- [ ] Run smoke tests against staging checkout with and without the upsell selected; capture screenshots for release notes.
- [ ] Update internal docs/playbooks describing how to enable/disable upsells per product and how to verify pricing.

## Open Questions
- Do we need a fallback Stripe price (auto-created) when `order_bump.stripe.price_id` is missing, or should validation block deploys?
- Should order bumps default to “selected” for certain products, and how do we communicate that in the UI without surprising users?
- Are there downstream systems (e.g., CRM, fulfilment) that require additional metadata beyond what we currently store?
- If we allow multiple upsells, should we enforce an order or limit, and how do we surface them coherently in analytics and receipts?

## Verification Checklist (Once Dev Work Completes)
1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:unit`
4. Manual Stripe embedded checkout (order bump on/off)
5. Manual PayPal checkout (order bump on/off)
6. Confirm checkout session metadata in Stripe dashboard reflects order bump selection
7. Validate product YAML with `pnpm --filter @apps/store validate:products`
