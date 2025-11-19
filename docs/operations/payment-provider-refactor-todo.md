# Payment Provider Routing TODO

## Goals & Constraints
- Allow each product to specify which payment processor (Stripe, Whop, Easy Pay Direct, Paddle, LemonSqueezy, etc.) and which account/tenant of that processor should be used without touching checkout logic.
- Preserve the existing metadata/telemetry (ghl tags, license entitlements, attribution) regardless of provider – metadata continues to live in product JSON, not vendor dashboards.
- Keep the operational workflow similar to the price update CLI: a single source of truth (`apps/store/data/products/**`) plus scripts (`update:price`, upcoming provider switch tool) that fan out to manifests and validation.
- Avoid duplicative documentation updates per price/provider change; only the SOP in `docs/operations` should need edits when the workflow itself changes.

## Current State (pain points)
- `apps/store/app/checkout/[slug]/route.ts`, `apps/store/app/checkout/success/actions.ts`, and the Stripe webhook pipeline are tightly coupled to Stripe-specific helpers (`getStripeClient`, `resolvePriceForEnvironment`).
- Product content only exposes a `stripe` block (`price_id`, `test_price_id`, `optional_items`), so we cannot express "this SKU lives in Stripe account B" or "send this product through Paddle".
- Database tables (`checkout_sessions`, `orders`, `webhook_logs`) only persist `stripe_*` columns, so adding other providers means bolting on ad-hoc tables.
- Ops scripts (`apps/store/scripts/update-stripe-*.ts`) assume a single Stripe account and globally configured env vars.

## Proposed Architecture
1. **Payment descriptor on each product** – introduce `payment` metadata that declares `provider`, `account` (alias), and provider-specific settings (price IDs, plan IDs, success URLs, etc.). Existing `stripe` block becomes a nested `payment.providers.stripe` entry so we can add `whop`, `lemonsqueezy`, etc. later.
2. **Payment account registry** – configuration file (checked in) that maps an alias (e.g. `primary_stripe`, `adults_stripe`) to environment variable keys for live/test secret/publishable/webhook secrets. Product JSON only references the alias.
3. **Provider adapter interface** – a TypeScript interface in `apps/store/lib/payments/providers/` with methods such as `createCheckout`, `normalizeWebhookEvent`, `retrieveSession`, and `syncMetadata`. Each adapter receives normalized metadata from our layer and returns a provider-agnostic result (session URL, normalized order payload, etc.).
4. **Checkout router** – new module that loads the product, picks the adapter based on `payment.provider`, and delegates to the adapter. `app/checkout/[slug]/route.ts` only builds metadata/common params; everything provider-specific lives behind adapters.
5. **Fulfillment pipeline** – webhook handlers and `/checkout/success` actions route through the same adapter interface, converting provider responses into the normalized `CheckoutOrder` used by license + GHL sync.
6. **Database generalization** – add provider-agnostic columns (`provider_session_id`, `provider_payment_id`, `provider_charge_id`, `payment_provider`) while keeping existing `stripe_*` fields populated for backwards compatibility. Future providers can use the generic columns without schema churn.

## Implementation Steps

> **Reversibility & Safety**
> - Keep work isolated to feature branches until all adapters/tests are ready; every code change in this checklist should remain backward compatible until we flip the switch.
> - Avoid running schema migrations against shared Neon/Vercel databases while iterating. Point `DATABASE_URL` to a local/throwaway instance so new columns can be discarded with the branch.
> - Do not delete or rename existing `stripe` fields in product JSON/schemas until the new `payment` structure is live; add optional fields first, verify, then migrate.
> - When scripting manifest/product migrations, ensure commands accept `--dry-run` and back up files so we can roll back if needed.
> - Defer any permanent Stripe metadata changes (e.g., cross-account tag updates) until the new account registry is validated; use sandbox/test accounts during development.

### 1. Product & schema updates
- [ ] Update `apps/store/lib/products/product-schema.ts` to add a `payment` object with:
  - `provider`: enum (`stripe`, `whop`, `paddle`, `lemonsqueezy`, `easy_pay_direct`, etc.).
  - `account`: alias string (defaults to `primary` for Stripe to match current env).
  - `mode`, `success_url`, `cancel_url`, metadata overrides.
  - Provider-specific nested blocks (start with `stripe.price_id`, `stripe.test_price_id`, `stripe.optional_items`).
- [ ] Update `apps/store/data/products/*.json` via codemod/script to wrap legacy `stripe` metadata under `payment.provider = "stripe"`.
- [ ] Extend `apps/store/scripts/update-price.ts` to read/write the new layout, accept `--provider` and `--account` flags, and ensure the manifest entry captures provider + account info.
- [ ] Update `apps/store/data/prices/manifest.json` structure so each entry tracks `{ slug, provider, account, livePriceId, testPriceId }`. Adjust `convert:products` + `validate:products` accordingly.

### 2. Payment account registry & env handling
- [ ] Add `apps/store/config/payment-accounts.ts` (or JSON) describing supported providers/accounts and env var keys for live/test secrets, publishable keys, webhook secrets.
- [ ] Refactor `apps/store/lib/payments/stripe-environment.ts` to read from this registry. Support env names like `STRIPE_SECRET_KEY__primary__live`, `STRIPE_SECRET_KEY__primary__test`, etc., while keeping the current single-account names as defaults.
- [ ] Teach `getStripeClient` and `resolvePriceForEnvironment` to accept `{ accountAlias, mode }` so adapters can fetch credentials per product.

### 3. Provider adapters & checkout router
- [ ] Create `apps/store/lib/payments/providers/base.ts` defining shared types:
  ```ts
  interface CheckoutRequest {
    slug: string;
    quantity: number;
    metadata: Record<string, string>;
    customerEmail?: string;
    optionalItems?: OptionalItem[];
    successUrl: string;
    cancelUrl: string;
  }
  interface CheckoutResponse {
    redirectUrl: string;
    sessionId: string;
    providerSessionId: string;
    provider: PaymentProviderId;
  }
  interface PaymentProviderAdapter {
    createCheckout(req: CheckoutRequest, context: ProviderContext): Promise<CheckoutResponse>;
    retrieveSession(sessionId: string, context: ProviderContext): Promise<NormalizedCheckoutSession>;
    handleWebhook(event: unknown, context: ProviderContext): Promise<NormalizedCheckoutEvent>;
  }
  ```
- [ ] Move Stripe-specific logic from `app/checkout/[slug]/route.ts` into `apps/store/lib/payments/providers/stripe/checkout.ts` that implements `createCheckout` using `resolvePriceForEnvironment` + `optional_items`.
- [ ] Implement a lightweight adapter stub for alternative providers (throwing "not yet supported") so we can land the router without locking ourselves into Stripe.
- [ ] Add `apps/store/lib/payments/payment-router.ts` that:
  1. Calls `getOfferConfig` (updated to expose `payment` info + metadata).
  2. Finds the adapter for the `provider`.
  3. Passes account alias + env to the adapter.
- [ ] Update `app/checkout/[slug]/route.ts` to call the router and remove direct `Stripe` imports.

### 4. Fulfillment & webhooks
- [ ] Define a `NormalizedOrder` type (slug, email, amount, currency, provider session/payment IDs, metadata, ghl tags, license data).
- [ ] Extract shared logic from `apps/store/app/checkout/success/actions.ts` and `apps/store/lib/payments/stripe-webhook/events/checkout-session-completed.ts` into a provider-agnostic `processFulfilledOrder(normalizedOrder)` helper that:
  - Ensures the account in `checkout_sessions`/`orders` matches `normalizedOrder.paymentProvider`.
  - Calls `ensureAccountForPurchase`, `createLicenseForOrder`, `syncOrderWithGhlWithRetry`.
- [ ] Update the Stripe webhook route + handler to:
  - Detect account alias (from event header or metadata) and hand off to the router.
  - Use the adapter’s `handleWebhook` to get a `NormalizedOrder`, then call the shared fulfillment helper.
- [ ] Add (placeholder) webhook endpoints for other providers pointing at the same fulfillment helper so the plumbing exists when those integrations begin.

### 5. Database & persistence changes
- [ ] Extend `apps/store/lib/database.ts` migrations to add nullable columns:
  - `payment_provider`, `provider_session_id`, `provider_payment_id`, `provider_charge_id`.
  - `provider_mode` (live/test) if useful for troubleshooting.
- [ ] Update `apps/store/lib/checkout/sessions.ts` + `orders.ts` to accept both legacy `stripe_*` fields and the new provider-agnostic columns. Ensure all insert/update callers supply both when available.
- [ ] Backfill existing rows by copying `stripe_*` values into the new columns so analytics/reporting does not break when we flip UI to use provider-neutral fields.

### 6. Tooling & automation
- [ ] Introduce a CLI (`pnpm --filter @apps/store update:payment-provider -- --slug <slug> --provider stripe --account adults --price-id ...`) mirroring the price-update workflow. The command should:
  - Update the product JSON + manifest (without touching docs).
  - Run `convert:products`, `validate:products`, and optionally sync Stripe metadata for the selected account.
- [ ] Update `apps/store/scripts/update-stripe-product-tags.ts` & `update-stripe-cross-sells.ts` to accept an `--account` flag and fetch credentials via the registry so we can sync metadata for whichever Stripe tenant a product points at.
- [ ] Document how to register new providers/accounts in `docs/operations/payment-provider-refactor.md` (this file) once implemented.

### 7. Testing & validation
- [ ] Add unit tests for the adapter router (`apps/store/tests/unit/payment-provider-router.test.ts`) covering:
  - Defaulting to Stripe when `payment` is omitted (backwards compatibility).
  - Selecting the correct Stripe account alias.
  - Surfacing errors when provider config is missing required IDs.
- [ ] Extend Playwright smoke tests to cover a product mocked to use an alternate provider (can stub adapter return value for now) so UI regression coverage remains.
- [ ] Update integration tests (`apps/store/tests/integration/stripe-live.test.ts`) to go through the new adapter API.

## Open Questions / Follow-ups
- How do we want to store credentials for non-Stripe providers (OAuth vs API keys)? The account registry should accommodate secrets stored in env or secret manager without checking them into git.
- Should webhook endpoints remain provider-specific (`/api/stripe/webhook`, `/api/paddle/webhook`) or move to a single `/api/payments/webhook?provider=stripe` router? (Leaning provider-specific to avoid breaking existing Stripe webhook configuration.)
- When we onboard a non-Stripe provider, do we need to replicate optional items / order bumps immediately, or can we gate that behind provider capabilities?
