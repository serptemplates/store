# Issue #194 – Hosted Stripe Checkout Migration Plan

## Activation Rules
- Show the hosted checkout flow only when the product YAML resolves to `cta_mode: checkout`.
- Ensure `buy_button_destination` is absent or set to `null`; any non-empty value forces an external CTA and bypasses `/checkout`.
- Stripe pricing (`stripe.price_id` or `stripe.test_price_id`) must remain configured so `cta_mode: checkout` can be inferred when not set explicitly.
- Verified via `apps/store/lib/products/product-adapter.ts` that products with `cta_mode: checkout` (or no external destination plus Stripe prices) automatically point their CTAs to `/checkout?product=<slug>`.
- Example configuration: `rawpixel-downloader` sets `status: live`, `cta_mode: checkout`, and `buy_button_destination: null` so the storefront routes directly into `/checkout`.

## Scope & Code Changes
- Remove the legacy embedded Stripe checkout implementation and all supporting components, tests, and fallbacks.
- Replace `/checkout` with a zero-UI redirect handler that immediately creates a hosted Stripe session and forwards the shopper (see [Stripe Checkout Quickstart](https://docs.stripe.com/checkout/quickstart?client=react&lang=node) for the canonical flow).
- Delete custom order bump UI/logic. Stripe cross-sell configured in the dashboard will handle upsells going forward.
- Drop the custom terms-of-service checkbox and metadata. Depend on Stripe Checkout’s built-in consent capture instead.
- Keep all existing metadata fields (affiliate, coupon, GHL, etc.) intact so downstream processing continues to function.
- Ensure the hosted checkout redirect happens via user-initiated navigation (same tab by default) so browsers don’t block the flow.
- Allow Stripe to determine available payment methods by default; keep support for the existing env overrides or payment method configuration IDs when present.

## Issue Update Draft

> **TL;DR**: `/checkout` should no longer render our custom form. Products that resolve to checkout mode must send shoppers to the confirm screen, where a click launches Stripe’s hosted Checkout. Stripe is responsible for collecting terms, cross-sells, and payment options. We still need to send the existing metadata (affiliate, lander, coupon, etc.); PayPal is no longer part of this flow.
>
> **Key implementation notes**
> - Remove every embedded checkout React component (`CheckoutPageView`, customer info sections, payment toggle, etc.) and the supporting hook/validation/tests.
> - Replace `/checkout` with a server redirect that launches Stripe automatically so the shopper never sits on an intermediate screen.
> - Product CTAs call `useCheckoutRedirect` inside the click handler so the redirect is treated as a user gesture; no popup blockers should appear.
> - Metadata/analytics: maintain existing metadata contract and fire “checkout_viewed” before redirect. Terms/order-bump metadata stays in Stripe.
> - PayPal flow remains out of scope; the hosted experience is Stripe-only.
>
> **Out of scope**: Stripe appearance, recovery email settings, and Dashboard cross-sell configuration remain dashboard tasks.

## Detailed Implementation Tasks

### Frontend
- `apps/store/app/checkout/page.tsx`: ✅ server route that reads query params, creates the hosted session, and issues an immediate redirect.
- ✅ Product CTAs use `useCheckoutRedirect` inside their click handlers so Stripe opens in the same tab without triggering popup blockers.
- ✅ Removed all React components, hooks, schemas, and tests that powered the embedded form (`CheckoutPageView`, `page/*` subcomponents, `useCheckoutPage`, `checkoutSchema`, etc.).
- ✅ Verified no checkout-specific CSS is required in `app/globals.css`; page now relies on utility classes only.
- 🔄 PayPal checkout is no longer exposed in the Stripe-hosted path; confirm downstream expectations reflect Stripe-only checkout.

### Redirect Helper
- `apps/store/components/product/useCheckoutRedirect.ts`:
  - ✅ Always request hosted checkout sessions (no embedded option).
  - ✅ Preserve metadata contract (affiliate, coupon, landerId) while defaulting `checkoutSource = hosted_checkout_stripe`.
  - ✅ Redirect in the current tab with `window.location.assign`, keeping the flow user-initiated so browsers don’t block the popup.
  - ✅ Improve error handling/logging to match the legacy flow and surface analytics callbacks.

### API & Checkout Session Logic
- `apps/store/app/api/checkout/session/route.ts` and `apps/store/lib/checkout/session/pricing.ts`:
  - ✅ Remove the embedded `client_secret` branch; always respond with `id` and `url`.
  - ✅ Stop injecting order-bump metadata and terms fields.
  - ✅ Allow Stripe to serve dashboard-enabled payment methods (don’t hard-code `["card"]` unless env demands it).
  - ✅ Keep payment configuration override logic working (`STRIPE_CHECKOUT_PAYMENT_METHODS`, payment config ID).
  - ✅ Ensure metadata stored in DB matches prior expectations minus removed fields.
  - ✅ Persist Stripe price/product identifiers and resolved GHL tags so downstream systems receive the hosted checkout context.
- `apps/store/lib/checkout/simple-checkout.ts`: ✅ mirror the hosted defaults (no embedded UI fields, no order-bump metadata, no card-only constraint).
- (PayPal routes remain for legacy flows but are not exposed via the Stripe hosted experience.)

### Validation & Types
- Update Zod schemas in `apps/store/lib/validation/checkout.ts` / `lib/checkout/session/validation.ts` to remove order-bump & terms fields and adjust tests in `apps/store/tests/checkout/validation.test.ts`. ✅ (schemas + session validation updated; checkout + API tests now assert hosted-only metadata).
- Update TypeScript interfaces that referenced the removed metadata. ✅ (product data adapters, validation helpers, and scripts strip legacy order-bump fields).

### Success Flow & Webhooks
- Review success handling (`apps/store/app/checkout/success/*` and `lib/payments/stripe-webhook/events/checkout-session-completed.ts`) to confirm nothing expects the removed metadata; adjust logging/copy if necessary. ✅ (webhook + success logic rely on normalized metadata only; no order-bump/terms fields referenced).
- Ensure Stripe Checkout consent (TOS) status is captured from `session.consent` and forwarded (with enriched metadata) to GHL sync + purchase metadata payloads. ✅

### Product & CTA Handling
- Document expectation that product YAML uses `cta_mode: checkout` with `buy_button_destination: null` (or absent) for hosted flow. No code changes required beyond ensuring `/checkout` path remains intact.

### Documentation
- Remove or rewrite any docs referencing the embedded flow; add rollout/rollback notes if needed (e.g., `docs/architecture/`). ✅ (updated architecture overview, operations runbooks, upsell checklists, and added `checkout-cross-sell-setup.md`).
- Create follow-up documentation tasks referencing Stripe resources:
  - [ ] [Customize appearance](https://docs.stripe.com/payments/checkout/customization/appearance)
  - [ ] [Save customer data during payment](https://docs.stripe.com/payments/checkout/save-during-payment)
  - [ ] [Metadata best practices](https://docs.stripe.com/api/metadata)
  - [ ] [Post-purchase redirects & custom success pages](https://docs.stripe.com/payments/checkout/custom-success-page)
  - [ ] [Recover abandoned carts](https://docs.stripe.com/payments/checkout/abandoned-carts)
  - [ ] [Analyze conversion funnel](https://docs.stripe.com/payments/checkout/analyze-conversion-funnel)
  - [ ] [Forward card details to third-party APIs](https://docs.stripe.com/payments/vault-and-forward)
  - [ ] [Revenue recovery analytics](https://docs.stripe.com/billing/revenue-recovery/recovery-analytics)
  - [ ] [Handling errors](https://docs.stripe.com/api/errors/handling)
  - [ ] [Entitlements / license upgrades](https://docs.stripe.com/api/entitlements/active-entitlement)

### Testing & QA
- Update or remove legacy tests tied to embedded checkout. ✅ (`apps/store/tests/manual/checkout-flow.spec.ts` removed; embedded page assertions no longer apply.)
- Add/adjust unit or integration tests covering the hosted redirect payload and metadata persistence. ✅ (API + webhook suites assert Stripe product/price IDs, GHL tags, and consent data.)
- Run required commands before completion: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` (plus higher-level suites if touched code demands). ✅

## Out-of-Code Config (handled later)
- Stripe Checkout appearance, abandoned-cart recovery emails, and cross-sell offers can stay at their dashboard defaults for the initial rollout; document any follow-up tasks separately.

## Step-by-Step Checklist

1. **Planning & Cleanup**
   - [x] Confirm product YAML activation rules (`cta_mode: checkout`, no `buy_button_destination`).
   - [x] Remove unused plan entries or references to embedded checkout from docs/notes (see updated docs under `docs/architecture/`, `docs/operations/`, `docs/upsell-*`, and `docs/checkout-cross-sell-setup.md`).
2. **Frontend Migration**
   - [x] Replace `/checkout` with an immediate hosted-checkout redirect so legacy deep links survive without presenting inline UI.
   - [x] Remove embedded checkout UI components (`CheckoutPageView`, `page/*` sections, `CustomerInfoForm`, etc.) and delete the related tests/stories.
   - [x] Delete supporting hooks, schemas, and helpers (`useCheckoutPage`, checkout Zod schema, coupon form logic, order summary utilities).
   - [x] Clean up checkout-specific styling (no specialized CSS remains outside utility classes).
   - [x] Ensure analytics events fire before navigation and handle popup-blocker errors gracefully.
3. **Redirect Helper**
   - [x] Update `useCheckoutRedirect` to always request hosted sessions, keep metadata, and navigate in the current tab.
   - [x] Improve error handling/logging as needed.
4. **API & Session Logic**
   - [x] Refactor checkout session API to only return hosted responses (no client secret).
   - [x] Remove order bump + terms metadata from session creation and persistence.
   - [x] Allow Stripe to choose payment methods unless env overrides are set.
   - [x] Mirror changes in `simple-checkout`.
5. **Validation & Types**
   - [x] Update Zod schemas/types to reflect new payload.
   - [x] Fix unit tests covering checkout validation and API metadata.
6. **Success & Webhook Flow**
   - [x] Verify success page/webhook processing with updated metadata.
   - [x] Adjust copy/logging if needed.
7. **Documentation**
   - [x] Update/remove embedded checkout references in docs.
   - [x] Note Stripe dashboard follow-up tasks separately if desired.
   - [ ] Review Stripe documentation follow-ups:
     - [ ] [Customize appearance](https://docs.stripe.com/payments/checkout/customization/appearance)
     - [ ] [Save customer data during payment](https://docs.stripe.com/payments/checkout/save-during-payment)
     - [ ] [Metadata best practices](https://docs.stripe.com/api/metadata)
     - [ ] [Post-purchase redirects & custom success pages](https://docs.stripe.com/payments/checkout/custom-success-page)
     - [ ] [Recover abandoned carts](https://docs.stripe.com/payments/checkout/abandoned-carts)
     - [ ] [Analyze conversion funnel](https://docs.stripe.com/payments/checkout/analyze-conversion-funnel)
     - [ ] [Forward card details to third-party APIs](https://docs.stripe.com/payments/vault-and-forward)
     - [ ] [Revenue recovery analytics](https://docs.stripe.com/billing/revenue-recovery/recovery-analytics)
     - [ ] [Handling errors](https://docs.stripe.com/api/errors/handling)
     - [ ] [Entitlements / license upgrades](https://docs.stripe.com/api/entitlements/active-entitlement)
8. **Testing & Verification**
   - [x] Run `pnpm lint`.
   - [x] Run `pnpm typecheck`.
   - [x] Run required test suites (`pnpm test:unit`, others if touched).
   - [ ] Manual spot-check: hosted redirect launches after the confirm button (no popup warning) and completes successfully.
9. **Review & Wrap-up**
   - [ ] Review diff for dead code removal and metadata coverage.
   - [ ] Update plan status / issue comments as necessary.
