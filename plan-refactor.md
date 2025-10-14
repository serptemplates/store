# Checkout & Payments Refactor Plan

This checklist guides the remaining modularization work started in issue #110. It focuses on breaking apart the most complex payment, webhook, and checkout modules without changing behavior. Each group of tasks represents a refactor milestone; complete them sequentially and run the verification commands listed in the acceptance criteria before moving on.

## Goals

- Reduce single-file complexity in Stripe webhook handling, checkout persistence, and checkout UI flows.
- Preserve the current public API surfaces via facade modules so external imports remain stable.
- Keep existing telemetry/logging behaviors intact while making dependencies explicit.
- Lean on the existing Vitest and Playwright smoke suites for regression coverage; add new tests only when coverage gaps are uncovered.

## How to Use This Checklist

- Start each milestone by reviewing the relevant module and capturing the current import graph so you understand existing coupling.
- When a task mentions “record results,” paste command summaries into your working notes or PR description for traceability.
- If a refactor step stalls or uncovers missing coverage, add new `- [ ]` bullets so future contributors see the outstanding work.
- Always run the full verification stack (`pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:smoke`) after structural changes, even if the code compiles.

## Completed Milestones

- [x] Confirm lint, typecheck, unit, and smoke commands remain current (`pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:smoke`).
- [x] Catalogue all imports/exports for `apps/store/app/api/stripe/webhook/route.ts`.
  - Imports: Node timers `sleep`, Next.js `NextRequest`/`NextResponse`, Stripe types, checkout store accessors (`findCheckoutSessionByPaymentIntentId`, `findCheckoutSessionByStripeSessionId`, `markStaleCheckoutSessions`, `upsertCheckoutSession`, `upsertOrder`, `updateCheckoutSessionStatus`, `updateOrderMetadata`), analytics tracker, offer config loader, GHL client (`syncOrderWithGhl`, `GhlRequestError`, `RETRYABLE_STATUS_CODES`), Stripe client/env helpers, webhook log recorder, shared logger, ops alert notifier, license service (`createLicenseForOrder`).
  - Exports: `POST` request handler, `runtime` constant.
- [x] Identify existing test coverage for Stripe webhook flows and note any gaps needing new tests.
  - Coverage: `apps/store/tests/api/stripe-webhook.test.ts` exercises `checkout.session.completed` happy path (with GHL success), GHL retry failure + ops alert, `payment_intent.succeeded`, and `payment_intent.payment_failed`.
  - Gaps: no direct assertions for license service interactions (`createLicenseForOrder`, metadata update failures), missing coverage for offer lookup failures/missing metadata branches, and no tests for default-case logging of unhandled event types.
- [x] Draft target module structure for Stripe webhook handling (e.g. event dispatcher, shared helpers, GHL retry helper).
  - Proposed layout under `apps/store/lib/payments/stripe-webhook/`:
    - `index.ts`: public facade exposing `handleStripeEvent` and reusable helpers for routes/tests.
    - `events/checkout-session-completed.ts`: orchestrates checkout session persistence, license creation, analytics, and downstream sync; depends on helper modules via injected dependencies.
    - `events/payment-intent-succeeded.ts` and `events/payment-intent-failed.ts`: encapsulate order/session updates for each intent outcome.
    - `helpers/ghl-sync.ts`: wraps retry/backoff logic currently embedded in the route.
    - `helpers/license.ts`: normalizes metadata extraction + license creation/update flow.
    - `helpers/metadata.ts` / `helpers/checkout-session.ts`: shared normalization utilities (e.g., `normalizeMetadata`, `extractLicenseConfig`).
    - `logger.ts`: centralizes structured logging keys to avoid duplication.
- [x] Introduce facade exports (e.g. `lib/payments/stripe-webhook/index.ts`) without changing behavior.
  - Added `apps/store/lib/payments/stripe-webhook/index.ts` re-exporting `handleStripeEvent` from the existing route to establish the future import path.
- [x] Extract checkout session completed handler into dedicated module and update route to call it.
  - Added `apps/store/lib/payments/stripe-webhook/events/checkout-session-completed.ts` housing the previous inline logic (including license orchestration and GHL retry), wired route to import it, and moved metadata normalization helper to `lib/payments/stripe-webhook/metadata.ts`.
- [x] Extract payment intent handlers, refund handlers, and fallback logic into dedicated modules.
  - Created `events/payment-intent-succeeded.ts`, `events/payment-intent-failed.ts`, and `events/unhandled-event.ts`; routed switch cases now delegate to these helpers. Existing codebase had no explicit refund handler, so none was migrated yet—future refund handling can join this layout.
- [x] Move GHL sync retry logic into shared helper with unit coverage if missing.
  - Extracted retry/backoff behavior to `helpers/ghl-sync.ts` and added `ghl-sync.test.ts` covering success retries, fatal errors, and max-attempt exhaustion.
- [x] Re-run lint, typecheck, unit, and smoke suites; record results.
  - `pnpm lint` ✅
  - `pnpm typecheck` ✅
  - `pnpm test:unit` ✅ (includes new `ghl-sync` unit coverage)
  - `pnpm test:smoke` ✅ (Desktop Chrome project)
- [x] Catalogue all imports/exports for `apps/store/lib/checkout/store.ts`.
  - Imports: `randomUUID` (crypto), `ensureDatabase`/`query` (database pool).
  - Exports: type aliases (`CheckoutSource`, `CheckoutSessionStatus`), interfaces (`CheckoutSessionRecord`, `CheckoutSessionUpsert`, `CheckoutOrderUpsert`, `OrderRecord`), and data-access functions (`upsertCheckoutSession`, `updateCheckoutSessionStatus`, `upsertOrder`, `markStaleCheckoutSessions`, `findCheckoutSessionByStripeSessionId`, `findCheckoutSessionByPaymentIntentId`, `countPendingCheckoutSessionsOlderThan`, `getRecentOrderStats`, `updateOrderMetadata`, `findRecentOrdersByEmail`, `findRefundedOrders`).
- [x] Propose module split (sessions persistence, order persistence, reporting/helpers).
  - Suggested structure under `apps/store/lib/checkout/`:
    - `sessions.ts`: CRUD for checkout sessions plus status updates.
    - `orders.ts`: order upsert/metadata helpers shared by Stripe/PayPal flows.
    - `queries.ts`: reporting + finder utilities (`countPendingCheckoutSessionsOlderThan`, `getRecentOrderStats`, `findRecentOrdersByEmail`, `findRefundedOrders`).
    - `types.ts`: centralizes shared interfaces/enums (to avoid circular imports).
    - `index.ts`: public facade re-exporting stable surface for existing callers.
- [x] Add facade re-export file (e.g. `lib/checkout/index.ts`) to preserve API surface.
  - Established `apps/store/lib/checkout/index.ts` re-exporting the current `store.ts` API so downstream imports can transition to the facade during the refactor.
- [x] Migrate checkout session persistence functions into new module.
  - Created `lib/checkout/sessions.ts` housing checkout-session CRUD, moved shared helpers to `utils.ts`, and updated `store.ts` to re-export from new module.
- [x] Migrate order persistence functions and normalization helpers into new module.
  - Added `lib/checkout/orders.ts` containing order upsert/metadata/finders and introduced `utils.ts` for shared JSON/email helpers leveraged by both sessions and orders.
- [x] Relocate reporting/finders into query-focused module.
  - Moved `countPendingCheckoutSessionsOlderThan` and `getRecentOrderStats` into `lib/checkout/queries.ts`; `store.ts` now re-exports queries alongside orders/sessions.
- [x] Update imports across codebase to use new modules via facade and resolve type issues.
  - Repointed all `@/lib/checkout/store` imports to the new facade `@/lib/checkout`, leveraging the consolidated re-exports.
- [x] Run lint, typecheck, unit, and smoke suites; log results.
  - `pnpm lint` ✅
  - `pnpm typecheck` ✅
  - `pnpm test:unit` ✅
  - `pnpm test:smoke` ✅
- [x] Review `apps/store/app/api/checkout/session/route.ts` for responsibilities (validation, pricing, telemetry).
  - Responsibilities observed: rate limiting + JSON parsing, Zod validation/sanitization, coupon normalization and lookup, optional "simple checkout" fallback, Stripe price/product resolution (including product updates), metadata enrichment (terms, IP, affiliate), coupon math + promotion code handling, payment method configuration, session persistence via `upsertCheckoutSession`/`markStaleCheckoutSessions`, and response shaping for embedded vs hosted modes.
- [x] Define module boundaries for validation, pricing resolution, coupon enrichment, and telemetry.
  - Planned split:
    - `lib/checkout/session/validation.ts`: wraps Zod parsing, sanitization, and error formatting, returning a typed payload + metadata scaffold.
    - `lib/checkout/session/coupons.ts`: handles coupon normalization, discount math, metadata updates, and promotion-code bridging.
    - `lib/checkout/session/pricing.ts`: encapsulates Stripe product/price resolution, product drift detection, and line item assembly.
    - `lib/checkout/session/persistence.ts`: orchestrates `upsertCheckoutSession`, `markStaleCheckoutSessions`, and background persistence with structured logging.
    - `lib/checkout/session/telemetry.ts`: centralizes logger calls + structured events (e.g., invalid JSON, payment method config) for reuse/testing.
- [x] Introduce new helper modules and route-level facade.
  - Added `lib/checkout/session/{validation,coupons,pricing,persistence}/` plus index re-export to decouple the API route from implementation details.
- [x] Move validation + sanitization logic into helper, ensuring existing tests cover errors.
  - `parseCheckoutRequest` now encapsulates JSON parsing, schema validation, sanitization, and metadata normalization.
- [x] Extract pricing and metadata assembly to helper module.
  - `createStripeCheckoutSession` in `pricing.ts` now handles price resolution, product drift updates, coupon math, payment config logging, and session parameter creation.
- [x] Relocate telemetry/logging side effects into dedicated helper or hook.
  - Validation helper now logs invalid JSON, pricing helper emits payment-method diagnostics, and persistence helper logs failures instead of inline `console.error`.
- [x] Execute lint, typecheck, unit, smoke; document outcomes.
  - `pnpm lint` ✅
  - `pnpm typecheck` ✅
  - `pnpm test:unit` ✅
  - `pnpm test:smoke` ✅

## Remaining Tasks

- [x] Inventory subcomponents and hooks within `apps/store/components/checkout/CheckoutPageView.tsx`.
  - Hooks: `useSearchParams`, `useRouter`, `useForm` (with `zodResolver`), RHF `watch`/`setValue`, `useCheckoutRedirect`, `useMemo`, `useCallback`, plus three `useEffect` blocks (coupon sync, product lookup + redirect, coupon reset on slug change).
  - Local state: `showCoupon`, `product`, `isLoading`, `isApplyingCoupon`, `appliedCoupon`, `couponFeedback`; derived form state via RHF (`paymentMethod`, `couponCode`).
  - Async flows: `applyCoupon` posts to `/api/checkout/validate-coupon`, `beginCheckout` handles Stripe submissions, PayPal flow delegated to `PayPalCheckoutButton`.
  - UI regions: header, customer information form, order summary + coupon controls, payment method options, and submit/legal section.
- [x] Decide on new component structure (e.g. `PaymentOptions`, `OfferSummary`, `LegalNotices`, controller hook).
  - Create `components/checkout/page/` to house cohesive pieces.
  - Add `useCheckoutPage` hook that encapsulates product lookup, coupon lifecycle, RHF wiring, and checkout submission orchestration.
  - Presentational components:
    - `CheckoutHeader` for title/subtitle.
    - `CustomerInformationSection` for RHF-driven customer fields.
    - `OrderSummarySection` handling pricing display, coupon entry, and status messaging.
    - `PaymentMethodSection` rendering Stripe vs PayPal selectors.
    - `CheckoutActions` deciding between Stripe submit button and `PayPalCheckoutButton`.
  - Share lightweight props/types via `page/types.ts` to keep data contracts explicit.
- [x] Create new subcomponents/hooks and migrate JSX progressively, keeping props typed.
  - Added `page/useCheckoutPage.ts` to encapsulate form wiring, coupon lifecycle, and checkout submission logic.
  - Introduced presentational components (`CheckoutHeader`, `CustomerInformationSection`, `OrderSummarySection`, `PaymentMethodSection`, `CheckoutActions`) to render the previous JSX blocks.
  - Updated `CheckoutPageView.tsx` to orchestrate the hook + sections, shrinking the file and clarifying dependency flow.
- [x] Update related tests or stories if needed; add coverage where gaps appear.
  - No dedicated unit or storybook coverage exists for `CheckoutPageView`; verified Playwright smoke tests exercise the rendered flow.
  - No changes required for existing Vitest suites because the public component API remains the same.
- [x] Run lint, typecheck, unit, smoke; confirm checkout UI behavior via Playwright MCP logs.
  - `pnpm lint` ✅
  - `pnpm typecheck` ✅
  - `pnpm test:unit` ✅
  - `pnpm test:smoke` ✅ (Desktop Chrome project — Playwright MCP logs clean)
- [x] Audit long CLI scripts (`scripts/update-video-metadata.ts`, `scripts/revoke-refunded-licenses.ts`) for shared utilities to extract later.
  - `update-video-metadata.ts`: repeated environment bootstrap (multiple `.env` lookups) and data-root resolution logic are good candidates for a shared `scripts/utils/env.ts`. HTML scraping helpers (`extractMetaTag`, `extractJsonPayload`, `decodeHtmlEntities`) and fallback metadata builder could live under `lib/products/video-scraper` for reuse by future product importers.
  - `revoke-refunded-licenses.ts`: CLI arg parsing, environment loading, offer-id normalization, and license revocation logging mirror patterns in other scripts; consider extracting into a `scripts/utils/cli.ts` plus reusing checkout/license-service helpers instead of re-implementing `normalizeOfferId`/`formatCurrency`.
- [x] Track follow-up tasks spawned during refactor (add new checkbox bullets as needed).
  - Added a deferred-work section capturing extraction tasks for script utilities and video metadata helpers.

## Deferred Work

- [x] Extract shared CLI environment bootstrap into `apps/store/scripts/utils/env.ts` (reuse in video metadata + refund revocation scripts).
  - Added `loadScriptEnvironment` that resolves repo/store roots and loads `.env` files in consistent order; both CLI scripts now depend on it instead of duplicating setup.
- [x] Create `scripts/utils/cli.ts` with option parsing/logging helpers and migrate `revoke-refunded-licenses.ts` to use it.
  - Introduced `createCliParser` (boolean/string/number helpers) and `createScriptLogger`, replacing the bespoke parser + console prefixes in the revocation script.
- [x] Promote reusable video metadata scraping helpers into a tested module (e.g. `lib/products/video-scraper`) referenced by CLI scripts and future ingesters.
  - Implemented `lib/products/video-scraper/index.ts` exposing video-key normalization, HTML scraping, and YouTube API helpers; `update-video-metadata.ts` now consumes the shared module.
