# Issue #194 – Hosted Stripe Checkout Migration Plan

## Activation Rules
- Show the hosted checkout flow only when the product YAML resolves to `cta_mode: checkout`.
- Ensure `buy_button_destination` is absent or set to `null`; any non-empty value forces an external CTA and bypasses `/checkout`.
- Stripe pricing (`stripe.price_id` or `stripe.test_price_id`) must remain configured so `cta_mode: checkout` can be inferred when not set explicitly.

## Scope & Code Changes
- Remove the legacy embedded Stripe checkout implementation and all supporting components, tests, and fallbacks.
- Replace `/checkout` with the new hosted-focused experience; no dual rendering or feature flag required.
- Delete custom order bump UI/logic. Stripe cross-sell configured in the dashboard will handle upsells going forward.
- Drop the custom terms-of-service checkbox and metadata. Depend on Stripe Checkout’s built-in consent capture instead.
- Keep all existing metadata fields (affiliate, coupon, GHL, etc.) intact so downstream processing continues to function.
- Ensure the hosted checkout redirect opens in a new browser tab when launched from the storefront.
- Allow Stripe to determine available payment methods by default; keep support for the existing env overrides or payment method configuration IDs when present.

## Detailed Implementation Tasks

### Frontend
- `apps/store/app/checkout/page.tsx`: render the hosted checkout experience (current `CheckoutPageView`) and remove any references to `EmbeddedCheckoutView` and related suspense/fallbacks.
- Delete the following components (and their tests/story usage):
  - `apps/store/components/checkout/EmbeddedCheckoutView.tsx`
  - `apps/store/components/checkout/StripeCheckoutWrapper.tsx`
  - `apps/store/components/checkout/OptimizedCheckout.tsx`
  - `apps/store/components/checkout/CheckoutErrorBoundary.tsx` (and any other embedded-only helpers)
- Clean up supporting utilities/hooks/tests tied to the embedded flow, e.g. `apps/store/tests/components/embedded-checkout-view.test.tsx` and `apps/store/tests/e2e/checkout-fallback.test.ts`.
- Update `CheckoutPageView` and the `page/*` subcomponents to:
  - remove order-bump UI and terms-of-service checkbox.
  - ensure product details (price, coupon application, PayPal toggle, cancellation banner) still render as needed.
  - wire analytics hooks for checkout viewed, coupon applied, PayPal selection, and hosted redirect errors (no regressions vs. embedded version).
- Adjust `useCheckoutPage` hook to drop order-bump & terms state, maintain coupon handling, and rely on the hosted redirect helper for Stripe flow.
- Update PayPal button usage so metadata no longer carries order-bump fields or terms flags.

### Redirect Helper
- `apps/store/components/product/useCheckoutRedirect.ts`:
  - Always request hosted checkout sessions (no embedded option).
  - Preserve metadata contract (affiliate, coupon, landerId).
  - Open Stripe session URLs in a new tab (`window.open`).
  - Improve error handling/logging to match the legacy flow.

### API & Checkout Session Logic
- `apps/store/app/api/checkout/session/route.ts` and `apps/store/lib/checkout/session/pricing.ts`:
  - Remove the embedded `client_secret` branch; always respond with `id` and `url`.
  - Stop injecting order-bump metadata and terms fields.
  - Allow Stripe to serve dashboard-enabled payment methods (don’t hard-code `["card"]` unless env demands it).
  - Keep payment configuration override logic working (`STRIPE_CHECKOUT_PAYMENT_METHODS`, payment config ID).
  - Ensure metadata stored in DB matches prior expectations minus removed fields.
- `apps/store/lib/checkout/simple-checkout.ts`: mirror the hosted defaults (no embedded UI fields, no order-bump metadata, no card-only constraint).

### Validation & Types
- Update Zod schemas in `apps/store/lib/validation/checkout.ts` / `lib/checkout/session/validation.ts` to remove order-bump & terms fields and adjust tests in `apps/store/tests/checkout/validation.test.ts`.
- Update TypeScript interfaces that referenced the removed metadata.

### Success Flow & Webhooks
- Review success handling (`apps/store/app/checkout/success/*` and `lib/payments/stripe-webhook/events/checkout-session-completed.ts`) to confirm nothing expects the removed metadata; adjust logging/copy if necessary.

### Product & CTA Handling
- Document expectation that product YAML uses `cta_mode: checkout` with `buy_button_destination: null` (or absent) for hosted flow. No code changes required beyond ensuring `/checkout` path remains intact.

### Documentation
- Remove or rewrite any docs referencing the embedded flow; add rollout/rollback notes if needed (e.g., `docs/architecture/`).

### Testing & QA
- Update or remove legacy tests tied to embedded checkout.
- Add/adjust unit or integration tests covering the hosted redirect payload and metadata persistence.
- Run required commands before completion: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` (plus higher-level suites if touched code demands).

## Out-of-Code Config (handled later)
- Stripe Checkout appearance, abandoned-cart recovery emails, and cross-sell offers can stay at their dashboard defaults for the initial rollout; document any follow-up tasks separately.

## Step-by-Step Checklist

1. **Planning & Cleanup**
   - [ ] Confirm product YAML activation rules (`cta_mode: checkout`, no `buy_button_destination`).
   - [ ] Remove unused plan entries or references to embedded checkout from docs/notes.
2. **Frontend Migration**
   - [ ] Update `/checkout` page to render the hosted checkout UI.
   - [ ] Delete embedded checkout components/scripts (`EmbeddedCheckoutView`, `OptimizedCheckout`, `StripeCheckoutWrapper`, `CheckoutErrorBoundary`, related helpers).
   - [ ] Rip out embedded-specific tests (unit/integration/E2E).
   - [ ] Refactor `CheckoutPageView` + subcomponents to remove order bump + terms checkbox, ensure hosted flow UX.
   - [ ] Adjust analytics hooks to fire from the new hosted flow.
   - [ ] Ensure PayPal button metadata matches new expectations.
3. **Redirect Helper**
   - [ ] Update `useCheckoutRedirect` to always request hosted sessions, keep metadata, and open in new tab.
   - [ ] Improve error handling/logging as needed.
4. **API & Session Logic**
   - [ ] Refactor checkout session API to only return hosted responses (no client secret).
   - [ ] Remove order bump + terms metadata from session creation and persistence.
   - [ ] Allow Stripe to choose payment methods unless env overrides are set.
   - [ ] Mirror changes in `simple-checkout`.
5. **Validation & Types**
   - [ ] Update Zod schemas/types to reflect new payload.
   - [ ] Fix unit tests covering checkout validation.
6. **Success & Webhook Flow**
   - [ ] Verify success page/webhook processing with updated metadata.
   - [ ] Adjust copy/logging if needed.
7. **Documentation**
   - [ ] Update/remove embedded checkout references in docs.
   - [ ] Note Stripe dashboard follow-up tasks separately if desired.
8. **Testing & Verification**
   - [ ] Run `pnpm lint`.
   - [ ] Run `pnpm typecheck`.
   - [ ] Run required test suites (`pnpm test:unit`, others if touched).
   - [ ] Manual spot-check: hosted redirect opens in new tab, PayPal flow works.
9. **Review & Wrap-up**
   - [ ] Review diff for dead code removal and metadata coverage.
   - [ ] Update plan status / issue comments as necessary.
