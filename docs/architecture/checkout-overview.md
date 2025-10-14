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
3. `createStripeCheckoutSession` (pricing module) prepares Stripe payloads, reconciles product metadata drift, and returns the resolved line items.
4. `persistCheckoutSession` (persistence module) records the session asynchronously and updates existing records via `@/lib/checkout`.
5. The response builder branches on `uiMode` to support hosted redirect and embedded checkout.

Existing Vitest suites (`tests/api/checkout-session.test.ts`, `tests/checkout/**`) cover the controller flow. When you add new helpers keep them behind the facade so API routes and tests only need to update import paths.

## Adding new checkout flows

1. Add domain logic under `apps/store/lib/checkout/*` and re-export it through `index.ts`.
2. Update the controller hook (`components/checkout/page/useCheckoutPage.ts`) or related server actions to consume the new helper.
3. Extend the relevant tests:
   - Validation / coupon behavior → `tests/api/checkout-session.test.ts`.
   - Session persistence → `tests/checkout/validation.test.ts` or `tests/checkout/coupons.test.ts`.
   - Full-stack behavior → Playwright `tests/manual/checkout-flow.spec.ts`.
4. Run the acceptance stack: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:smoke`.
