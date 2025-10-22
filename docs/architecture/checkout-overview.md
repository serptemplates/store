# Checkout Module Overview

The checkout refactor split the legacy `lib/checkout/store.ts` monolith into focused modules. This keeps the API surface stable (`@/lib/checkout`) while clarifying responsibilities and making it easier to extend Stripe or PayPal flows.

## Public facade

Import everything through `@/lib/checkout`. The facade re-exports the canonical types and helpers:

- `sessions.ts` – CRUD helpers for checkout sessions (insert/update/status transitions, stale session pruning).
- `orders.ts` – Order upsert helpers, metadata updates, and reporting hooks that operate on orders.
- `queries.ts` – Read-only reporting helpers (`findRecentOrdersByEmail`, `countPendingCheckoutSessionsOlderThan`, etc.).
- `session/` – Higher-level helpers used by the API route (`parseCheckoutRequest`, `applyCouponIfPresent`, `createStripeCheckoutSession`, `persistCheckoutSession`).
- `types.ts` – Shared enums and record shapes to keep inter-module imports stable.

## API route flow (`app/api/checkout/session/route.ts`)

1. `parseCheckoutRequest` (validation module) normalizes JSON, applies Zod validation, and builds metadata scaffolding.
2. `applyCouponIfPresent` (coupons module) handles promotion-code lookups and discount math.
3. `createStripeCheckoutSession` (pricing module) prepares Stripe payloads, reconciles product metadata drift, and returns the resolved line items. The helper now stamps `stripePriceId`, `stripeProductId`, resolved `ghlTagIds`, and any request metadata onto both the Checkout Session and the payment intent so downstream consumers (GHL, success flows, analytics) receive a complete hosted-checkout payload.
4. `persistCheckoutSession` (persistence module) records the session asynchronously and updates existing records via `@/lib/checkout`, merging the full metadata set returned by the pricing helper.
5. The response builder returns the hosted checkout session payload (`id` + `url`) and never emits embedded client secrets.

Existing Vitest suites (`tests/api/checkout-session.test.ts`, `tests/checkout/**`) cover the controller flow. When you add new helpers keep them behind the facade so API routes and tests only need to update import paths.

### Metadata & consent contract

- Hosted Stripe checkout always includes:
  - `checkoutSource=hosted_checkout_stripe`
  - `offerId`, `landerId`, environment flag, and any affiliate/coupon inputs
  - `stripePriceId` / `stripeProductId` (resolved during session creation)
  - `ghlTagIds` (comma-separated from product/offer config) so the webhook → GHL sync can apply tags without recomputing them
- On `checkout.session.completed`, webhook processing captures Stripe’s terms-of-service consent:
  - `stripeTermsOfService` reflects the Checkout `consent.terms_of_service` value
  - `stripeTermsOfServiceRequirement` mirrors `consent_collection.terms_of_service`
  - `tosAccepted` is normalized to `"true"`/`"false"` and forwarded to the GHL sync context plus purchase metadata blob
- PayPal flows reuse the same persistence shape but set `checkoutSource=hosted_checkout_paypal` and omit Stripe-specific identifiers.

## Adding new checkout flows

1. Add domain logic under `apps/store/lib/checkout/*` and re-export it through `index.ts`.
2. Wire the `/checkout` confirmation screen (and product CTA handlers) to consume the new helper.
3. Extend the relevant tests:
   - Validation / coupon behavior → `tests/api/checkout-session.test.ts`.
   - Session persistence → `tests/checkout/validation.test.ts` or `tests/checkout/coupons.test.ts`.
4. Run the acceptance stack: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:smoke`.
