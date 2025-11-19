# Payment Provider Routing TODO

## Goals & Constraints
- Allow each product to specify which payment processor (Stripe, Whop, Easy Pay Direct, LemonSqueezy, PayPal, etc.) and which account/tenant of that processor should be used without touching checkout logic.
- Preserve the existing metadata/telemetry (ghl tags, license entitlements, attribution) regardless of provider – metadata continues to live in product JSON, not vendor dashboards.
- Keep the operational workflow similar to the price update CLI: a single source of truth (`apps/store/data/products/**`) plus scripts (`update:price`, upcoming provider switch tool) that fan out to manifests and validation.
- Avoid duplicative documentation updates per price/provider change; only the SOP in `docs/operations` should need edits when the workflow itself changes.

## Current State (pain points)
- `apps/store/app/checkout/[slug]/route.ts`, `apps/store/app/checkout/success/actions.ts`, and the Stripe webhook pipeline are tightly coupled to Stripe-specific helpers (`getStripeClient`, `resolvePriceForEnvironment`).
- Product content only exposes a `stripe` block (`price_id`, `test_price_id`, `optional_items`), so we cannot express "this SKU lives in Stripe account B" or "send this product through another processor".
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

### ✅ Completed (current branch)
- Product schema + all product JSON now expose the `payment` block (provider/account/mode/success+cancel overrides) and optional items support `price_id` overrides. `update:price`, `convert:products`, and the manifest writer already read/write the new shape.
- Payment account registry (`apps/store/config/payment-accounts.ts`) powers multi-account Stripe credentials. `stripe-environment` + `stripe.ts` accept `{ mode, accountAlias }`, and `resolvePriceForEnvironment`/test price cloning respect the alias.
- Provider abstraction is live:
  - `apps/store/lib/payments/providers/base.ts` defines the adapter contract.
  - `apps/store/lib/payments/providers/stripe/checkout.ts` handles checkout creation, optional-item syncing, and metadata mirroring for Stripe, respecting account aliases.
  - `apps/store/lib/payments/payment-router.ts` (called from `app/checkout/[slug]/route.ts`) picks the provider + account for each product.
  - New Vitest suites cover both the route (metadata + delegation) and the Stripe adapter (optional items + error paths).
- Checkout metadata was trimmed down to the CRM-facing keys (`productSlug`, `productName`, `ghlTag`, `licenseEntitlements`, `paymentProvider`, `paymentProviderAccount`). Snake_case variants are synthesized at runtime, so the JSON source of truth only needs the camelCase keys.

The remaining checklist items below assume this baseline.

> **Reversibility & Safety**
> - Keep work isolated to feature branches until all adapters/tests are ready; every code change in this checklist should remain backward compatible until we flip the switch.
> - Avoid running schema migrations against shared Neon/Vercel databases while iterating. Point `DATABASE_URL` to a local/throwaway instance so new columns can be discarded with the branch.
> - Do not delete or rename existing `stripe` fields in product JSON/schemas until the new `payment` structure is live; add optional fields first, verify, then migrate.
> - When scripting manifest/product migrations, ensure commands accept `--dry-run` and back up files so we can roll back if needed.
> - Defer any permanent Stripe metadata changes (e.g., cross-account tag updates) until the new account registry is validated; use sandbox/test accounts during development.
- Temporary Neon database `neondb_payment_provider_refactor` now exists on the same cluster (created via the Vercel-provisioned credentials). Point local env vars at it while working on Steps 5+:
  - Pooled: copy the pooled connection string from Neon (set it as `DATABASE_URL`).
  - Unpooled: copy the direct connection string from Neon (set it as `DATABASE_URL_UNPOOLED`).
  - Keeping these values in local envs makes the work fully reversible; deleting or ignoring the temp DB leaves prod/staging untouched.

### 1. Product & schema updates
- [x] Update `apps/store/lib/products/product-schema.ts` to add a `payment` object with:
  - `provider`: enum (`stripe`, `whop`, `lemonsqueezy`, `easy_pay_direct`, etc.).
  - `account`: alias string (defaults to `primary` for Stripe to match current env).
  - `mode`, `success_url`, `cancel_url`, metadata overrides.
  - Provider-specific nested blocks (start with `stripe.price_id`, `stripe.test_price_id`, `stripe.optional_items`).
- [x] Update `apps/store/data/products/*.json` via codemod/script to wrap legacy `stripe` metadata under `payment.provider = "stripe"`.
- [x] Extend `apps/store/scripts/update-price.ts` to read/write the new layout, accept `--provider` and `--account` flags, and ensure the manifest entry captures provider + account info.
- [x] Update `apps/store/data/prices/manifest.json` structure so each entry tracks `{ slug, provider, account, livePriceId, testPriceId }`. Adjust `convert:products` + `validate:products` accordingly.

### 2. Payment account registry & env handling
- [x] Add `apps/store/config/payment-accounts.ts` (or JSON) describing supported providers/accounts and env var keys for live/test secrets, publishable keys, webhook secrets.
- [x] Refactor `apps/store/lib/payments/stripe-environment.ts` to read from this registry. Support env names like `STRIPE_SECRET_KEY__primary__live`, `STRIPE_SECRET_KEY__primary__test`, etc., while keeping the current single-account names as defaults.
- [x] Teach `getStripeClient` and `resolvePriceForEnvironment` to accept `{ accountAlias, mode }` so adapters can fetch credentials per product.

### 3. Provider adapters & checkout router
- [x] Create `apps/store/lib/payments/providers/base.ts` defining shared types:
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
-  ```
- [x] Move Stripe-specific logic from `app/checkout/[slug]/route.ts` into `apps/store/lib/payments/providers/stripe/checkout.ts` that implements `createCheckout` using `resolvePriceForEnvironment` + `optional_items`.
- [x] Implement a lightweight adapter stub for alternative providers (throwing "not yet supported") so we can land the router without locking ourselves into Stripe.
- [x] Add `apps/store/lib/payments/payment-router.ts` that:
  1. Calls `getOfferConfig` (updated to expose `payment` info + metadata).
  2. Finds the adapter for the `provider`.
  3. Passes account alias + env to the adapter.
- [x] Update `app/checkout/[slug]/route.ts` to call the router and remove direct `Stripe` imports.

### 4. Fulfillment & webhooks
- [x] Define a `NormalizedOrder` type (slug, email, amount, currency, provider session/payment IDs, metadata, ghl tags, license data).
- [x] Extract shared logic from `apps/store/app/checkout/success/actions.ts` and `apps/store/lib/payments/stripe-webhook/events/checkout-session-completed.ts` into a provider-agnostic `processFulfilledOrder(normalizedOrder)` helper that:
  - Ensures the account in `checkout_sessions`/`orders` matches `normalizedOrder.paymentProvider`.
  - Calls `ensureAccountForPurchase`, `createLicenseForOrder`, `syncOrderWithGhlWithRetry`.
- [x] Update the Stripe webhook route + handler to:
  - Detect account alias (from event header or metadata) and hand off to the router.
  - Use the adapter’s `handleWebhook` to get a `NormalizedOrder`, then call the shared fulfillment helper.
- [x] Add (placeholder) webhook endpoints for other providers pointing at the same fulfillment helper so the plumbing exists when those integrations begin.

### 5. Database & persistence changes
- [x] Extend `apps/store/lib/database.ts` migrations to add nullable columns:
  - `payment_provider`, `provider_session_id`, `provider_payment_id`, `provider_charge_id`.
  - `provider_mode` (live/test) if useful for troubleshooting.
- [x] Update `apps/store/lib/checkout/sessions.ts` + `orders.ts` to accept both legacy `stripe_*` fields and the new provider-agnostic columns. Ensure all insert/update callers supply both when available.
- [x] Backfill existing rows by copying `stripe_*` values into the new columns so analytics/reporting does not break when we flip UI to use provider-neutral fields.

### 6. Tooling & automation
- [x] Introduce a CLI (`pnpm --filter @apps/store update:payment-provider -- --slug <slug> --provider stripe --account adults --price-id ...`) mirroring the price-update workflow. The command:
  - Updates the product JSON + price manifest (no docs touched) and re-runs `convert:products` + `validate:products` for the affected slug.
  - Accepts optional `--mode`, `--success-url`, and Stripe ID overrides so switching accounts or providers is a single command.
- [x] Update `apps/store/scripts/update-stripe-product-tags.ts` & `update-stripe-cross-sells.ts` to accept an `--account` flag and fetch credentials via the registry so we can sync metadata for whichever Stripe tenant a product points at.
- [x] Document how to register new providers/accounts plus the CLI/script usage (see "Provider switch workflow" below).

#### Provider switch workflow
1. Create or fetch the new price IDs in Stripe (live + test) for the desired account.
2. Run `pnpm --filter @apps/store update:payment-provider -- --slug onlyfans-downloader --provider stripe --account adults --price-id price_xxx --test-price-id price_test_xxx`.
   - The script normalizes the account alias, updates `apps/store/data/products/<slug>.json` & `data/prices/manifest.json`, formats JSON, and runs `convert:products`/`validate:products` automatically.
3. Sync metadata for that Stripe tenant via `pnpm --filter @apps/store update:stripe-product-tags --account adults` and (if applicable) `pnpm --filter @apps/store update:stripe-cross-sells --account adults`.
   - Both scripts now resolve credentials through the payment account registry and will fail fast if env keys for the alias are missing. Cross-sell targets can be set per alias/mode using env names like `STRIPE_CROSS_SELL_DOWNLOADERS_PRODUCT_ID__ADULTS__LIVE` (fallbacks: alias-only, `_LIVE/_TEST`, then global base vars).
4. Once adapters for other providers exist, extend the product’s `payment` block (same CLI) and add provider-specific metadata without editing docs.

### 7. Provider enablement (pre-testing)
- [x] **Product schema + manifest for other processors**
  - Extend `apps/store/lib/products/product-schema.ts` (and regenerate `apps/store/data/product.schema.json`) with `payment.whop`, `payment.easy_pay_direct`, `payment.lemonsqueezy`, and `payment.paypal` blocks that capture identifiers we control (plan IDs, listing IDs, checkout URLs, metadata, webhook secrets, etc.).
  - Update `convert:products` and `validate:products` so these new blocks survive normalization.
  - Teach the price manifest (`apps/store/data/prices/manifest.json` + `apps/store/lib/pricing/price-manifest.ts`) to persist provider-specific identifiers and expose them through a typed loader so adapters only ever read from the manifest.
  - Populate the throwaway `demo-payment-adapter` entry with representative stub values so the workflow is demonstrable without touching real SKUs.
- [x] **Offer config plumbing** – ensure `getOfferConfig` / `OfferConfig` emit the full `payment` block (not just Stripe), tolerate SKUs without Stripe price IDs, and hand the router every provider-specific identifier needed by adapters.
- [x] **Adapter implementations** – build the first real non-Stripe adapter (target Whop) covering checkout creation + webhook normalization, then add scaffolding modules for Easy Pay Direct, LemonSqueezy, and PayPal so we have well-defined entry points.
- [x] **Provider-specific CLI ergonomics** – extend `update:payment-provider` (or add provider-specific helpers) so swapping a slug onto Whop/Easy Pay Direct is a single command that writes the new metadata and re-runs convert/validate just like the price workflow.
- [x] **Operational playbook** – document manual verification steps (which dashboard URLs to check, how to replay events/webhooks, how to flip aliases) for switching providers/accounts so ops can follow the same SOP every time.
- [x] **Manifest/API consumers** – update downstream consumers (checkout product details API, Google Merchant feed, etc.) so they gracefully handle provider-agnostic manifest entries rather than assuming Stripe price IDs.

Implementation notes:
- `getOfferConfig` now surfaces the complete `payment` block (stripe + whop/easy_pay_direct/lemonsqueezy/paypal/etc.) so adapters receive the same metadata defined in product JSON. `stripePriceId` is optional and only required when `payment.provider === "stripe"`.
- The checkout router registers adapters for `stripe`, `whop`, `easy_pay_direct`, `lemonsqueezy`, and `paypal`. Whop redirects to the configured `checkout_url`, while the other providers currently raise clear "Not implemented" errors so engineers have a drop-in module when their adapters ship.
- `pnpm --filter @apps/store update:payment-provider` accepts `--provider-config ./relative/path.json` to patch the `payment` block (and manifest entry) in one shot. Example patch:

  ```json
  {
    "provider": "whop",
    "account": "primary",
    "whop": {
      "api_key_alias": "demo_whop",
      "live": {
        "listing_id": "whop_listing_demo_live",
        "checkout_url": "https://whop.com/demo-payment-adapter-live"
      },
      "test": {
        "listing_id": "whop_listing_demo_test",
        "checkout_url": "https://whop.com/demo-payment-adapter-test"
      }
    }
  }
  ```

  Run `pnpm --filter @apps/store update:payment-provider -- --slug demo-payment-adapter --provider whop --provider-config ./patches/demo-whop.json`.

#### Provider switch SOP (current draft)
1. **Prep** – Ensure the new provider account/listing is configured and note the live/test identifiers plus webhook target URL.
2. **Patch product data** – Create a JSON snippet (example above) that captures the provider-specific metadata. Run `pnpm --filter @apps/store update:payment-provider -- --slug <slug> --provider <provider> --provider-config ./path/to/patch.json`. The script:
   - Updates `apps/store/data/products/<slug>.json` and `apps/store/data/prices/manifest.json`.
   - Normalizes JSON via `convert:products --slug <slug>` and re-runs `validate:products`.
3. **Update Stripe metadata (if still applicable)** – If the product continues to offer Stripe, run `pnpm --filter @apps/store update:stripe-product-tags --account <alias>` and the cross-sell script for that alias/mode to keep every tenant in sync.
4. **Manual verification**
   - Load `/checkout/<slug>` locally and confirm it redirects to the provider-specific URL (Whop adapter should jump directly to the configured checkout URL).
   - Inspect the provider dashboard (e.g., Whop listing page) to confirm metadata such as title, price, and fulfillment notes look correct.
   - Replay or send a test webhook into `apps/store/app/api/payments/<provider>/webhook` (currently returns 501 for placeholders) and capture the payload we will normalize once the full adapter lands.
   - Confirm GHL + fulfillment flows still work for Stripe-based SKUs (run `pnpm validate:products` + manual checkout) before rolling back any aliases.
5. **Document** – If a permanent provider switch is shipping, update the relevant SOP entry (e.g., `docs/operations/onlyfans-downloader-price-update.md`) with the new provider + account alias so future personnel know where the SKU lives.

#### Stripe multi-account workflow (ready today)
The existing site can already point different SKUs at different Stripe accounts. To flip a product to another account alias:
1. **Register the alias** – Add an entry to `apps/store/config/payment-accounts.ts` that declares the alias, human-readable `label`, and env var names (`STRIPE_SECRET_KEY__<alias>__live`, `STRIPE_SECRET_KEY__<alias>__test`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY__<alias>__{live,test}`, `STRIPE_WEBHOOK_SECRET__<alias>__{live,test}`, and optional `STRIPE_PAYMENT_CONFIG_ID__<alias>__{live,test}`).
2. **Provision credentials** – Inside the destination Stripe account, create/obtain the live + test publishable keys, secret keys, webhook signing secrets, and payment config IDs (if used). Drop them into `.env.local` using the alias-specific names. Create the live/test webhook endpoints in that account so Stripe signs events with the matching secrets.
3. **Create prices** – Manually create the live/test products + prices in the destination account. Note the `price_***` IDs (and `prod_***` IDs if you also mirror metadata via scripts).
4. **Patch the product** – Run `pnpm --filter @apps/store update:payment-provider -- --slug <slug> --provider stripe --account <alias> --price-id <live_price_id> --test-price-id <test_price_id>`. The script updates `apps/store/data/products/<slug>.json`, rewrites the manifest, and runs `convert:products` + `validate:products`.
5. **Restart + verify** – Restart `pnpm dev` (so it reads the new env vars), load `/checkout/<slug>`, and run a test checkout. In the dev server logs you should see `provider_account_alias: <alias>` and the transaction will appear under the target Stripe dashboard. Replay webhooks via `stripe listen` for each account to confirm fulfillment logs land in the right alias.
6. **Sync metadata** – If the SKU still lives in Stripe, run `pnpm --filter @apps/store update:stripe-product-tags -- --account <alias>` (and the cross-sell script) so each account’s products carry the same metadata/tags as the source of truth.

### 8. Provider-agnostic checkout metadata
- [x] Add `checkout_metadata` to the product schema + JSON files so every SKU can declare provider-agnostic metadata once (mirrored into `payment.metadata` and adapter payloads).
- [x] Auto-fill canonical metadata via `convert:products` (slug/offerId, canonical URLs, purchase URLs, payment provider + account alias, Stripe product IDs, license entitlements, primary GHL tags, success/cancel URLs) so product files remain the source of truth regardless of processor.
- [x] Snapshot current live metadata via `pnpm --filter @apps/store export:stripe-metadata -- --account <alias>` and store the Markdown output in `docs/operations/stripe-metadata-inventory.md` so we know every key/value pair that must be represented in `checkout_metadata`.
- [ ] Ensure the checkout metadata dictionary remains the single source of truth in `getOfferConfig` by auditing existing derived keys (product URLs, GHL tags, license entitlements) and documenting which entries are auto-generated vs. customizable overrides.
- [ ] Add unit tests covering metadata precedence (base defaults → product `checkout_metadata` → provider-specific overrides) plus regression coverage that adapters receive the merged payload.
- [ ] Teach non-Stripe adapters to treat `request.metadata` as immutable input—mirror it as needed, but never source canonical values from provider dashboards.

#### Required metadata keys (baseline)
- Canonical identifiers & URLs: `product_slug`, `offerId`, `apps_serp_co_product_page_url`, `store_serp_co_product_page_url`, `purchaseUrl`, `serply_link`, etc. – these drive attribution, Dub tracking, and checkout success/cancel routing.
- Fulfillment + licensing: `license_entitlements`/`LicenseEntitlements`, `landerId`, any entitlement alias we rely on when calling `createLicense`.
- GHL automation: `ghl_tag` (plus camelCase mirror) so webhook fulfillment can keep tagging/automation consistent no matter the processor.
- Payment context: `payment_provider` and `payment_provider_account` so adapters + telemetry know which credentials were used for a transaction.
- Optional but recommended: any metadata currently living only in Stripe (internal IDs, compare-at amounts, success URLs) should be mirrored here so the Stripe dashboard is no longer the source of truth.

### 9. PayPal adapter prerequisites & credential checklist
- [x] **Credentials** – Live + sandbox REST apps exist for alias `serpapps`; Client IDs/Secrets are stored in `.env.local` as `PAYPAL_CLIENT_ID__serpapps__{live,test}` / `PAYPAL_CLIENT_SECRET__serpapps__{live,test}`. Webhook IDs should *only* live in env vars (e.g., `PAYPAL_WEBHOOK_ID__serpapps__{live,test}`) after creating the endpoints inside PayPal Developer—never copy the raw `whsec_*` values into docs or source control.
- [ ] **Account registry** – Mirror the Stripe registry pattern so PayPal adapters resolve credentials via alias. Each entry maps `{ alias, label, env: { clientId, clientSecret, webhookId } }`.
- [x] **Product data** – `apps/store/data/products/demo-payment-adapter-paypal.json` is the canonical template. Every PayPal-backed SKU needs:
  - `payment.provider = "paypal"`, `payment.account = "<alias>"`, and metadata keys for client alias, webhook alias, checkout URLs, and plan/product IDs.
  - `checkout_metadata` entries for slug, URLs, purchase link, GHL tags, license entitlements, and payment-provider mirrors so fulfillment + analytics never depend on PayPal dashboards.
- [ ] **Adapter implementation** – Build `apps/store/lib/payments/providers/paypal/*` that can:
  - Create an order via the PayPal REST API using the live/test credentials resolved from the alias, then return the approval URL to `/checkout/[slug]`.
  - Normalize webhook events (`CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, refunds) into `NormalizedOrder` objects consumed by `order-fulfillment.ts`.
  - Sign/verify webhook payloads against the stored Webhook IDs.
- [ ] **Local demo plan** – Document once coded:
  - How to run `pnpm dev`, expose it via `ngrok`, and register the sandbox webhook to the ngrok URL.
  - How to switch the demo SKU onto PayPal via `pnpm --filter @apps/store update:payment-provider` and run through a full sandbox checkout.
  - Verification steps (dev server logs should show `payment_provider: paypal`, Neon throwaway DB receives the order, GHL tag fires) so we can regression test easily.

### 10. Converter + metadata stabilization
- [ ] **Fix converter regression** – `apps/store/scripts/convert-products.ts` currently throws `ReferenceError: stripeSchema is not defined` after the schema split. Import the shared schema helper correctly, rerun `pnpm --filter @apps/store convert:products`, and ensure the command no longer mutates unrelated files.
- [ ] **Re-run validators** – After the converter fix, rerun `pnpm --filter @apps/store validate:products` to refresh the manifest and confirm no stale provider metadata remains.
- [ ] **Metadata inventory audit** – Review `docs/operations/stripe-metadata-inventory.md` (sample at least 20 SKUs) to list which keys are consistently present (e.g. `ghl_tag`, `licenseEntitlements`, `productSlug`, `serply_link`). Mark these as required in `apps/store/data/README.md` and the JSON schema.
- [ ] **Backfill checkout_metadata** – For every SKU missing the required keys, update the product JSON `checkout_metadata` (or rely on converter defaults) so checkout/webhooks never depend on Stripe dashboard metadata.
- [ ] **Document precedence** – Write a short section in `apps/store/data/README.md` explaining the precedence order: converter defaults → `checkout_metadata` overrides → provider-specific overrides → runtime `additional_metadata`. Include examples for Stripe optional items and PayPal carts.

### 11. PayPal adapter implementation
- [x] **Account registry entry** – `apps/store/config/payment-accounts.ts` now includes the `serpapps` PayPal alias plus helper utilities (`normalizePayPalAccountAlias`, `getPayPalAccountConfig`, `getPayPalEnvVarCandidates`) so adapters can resolve client IDs, secrets, and webhook IDs for both modes without touching `.env` directly.
- [x] **Checkout implementation** – `apps/store/lib/payments/providers/paypal/checkout.ts` creates PayPal Orders via the REST API, injects the slug into `custom_id`, and appends `provider=paypal`, `paypal_mode`, and `paypal_account` to the return/cancel URLs so the success page can fall back to the new `processPayPalCheckout` server action. Required metadata keys today: `paypal_currency`, `paypal_live_amount_cents`, `paypal_test_amount_cents`, and (optionally) brand/description hints. Demo JSON illustrates the structure.
- [x] **Webhook → fulfillment** – `/api/payments/paypal/webhook/route.ts` verifies signatures against every configured alias/mode, then delegates to `apps/store/lib/payments/providers/paypal/webhook.ts` which fetches missing order details, builds a `NormalizedOrder`, and calls `processFulfilledOrder`. The handler returns the normalized payload so other callsites (e.g., success fallback) can reuse it.
- [x] **Checkout wiring** – Success page now recognizes `provider=paypal` + `token` query params and calls `processPayPalCheckout`, which captures the order via the PayPal API and reuses the webhook handler to seed fulfillment + CRM when webhooks aren’t available (e.g., localhost). Desktop/mobile CTAs/hero copy treat PayPal as a first-class checkout variant.
- [ ] **Sandbox playbook** – Document (in this file + `apps/store/data/README.md`) the ngrok workflow, webhook registration steps, metadata requirements, and verification checklist for running the PayPal demo SKU end to end on localhost.
  - [ ] Steps should cover: creating a sandbox webhook in PayPal Developer (pointing to `https://<ngrok>.ngrok.app/api/payments/paypal/webhook`), populating `PAYPAL_WEBHOOK_ID__serpapps__test`, running `pnpm dev`, exposing the dev server through ngrok, switching the demo SKU via `update:payment-provider`, completing a sandbox checkout, confirming the webhook log entry, and verifying the checkout success page captures fallback via `processPayPalCheckout`.
  - [ ] Include testing notes: PayPal blocks a merchant from buying their own product. Always log into `https://sandbox.paypal.com` with the **personal/buyer** sandbox account (e.g., `sb-oxizw47657663@personal.example.com`) in an incognito window before clicking the checkout link. If you see “This PayPal account is associated with the merchant you're trying to pay,” it means you’re still logged in as the business account—log out, switch to the buyer credentials, and retry so the approval UI loads correctly.
- [x] **PayPal product bootstrapper** – add a script (e.g., `pnpm --filter @apps/store paypal:create-products -- --alias serpapps --input ./paypal-products.json`) that uses the REST API to create PayPal “products” / “plans` based on a supplied list (name, description, amount, currency). Output the live/test `product_id` / `plan_id` pairs so we can paste them into the product JSON `payment.paypal` block.
- [ ] **Extract reusable adapter package** – design a plan to move the payment adapter + fulfillment layer into a framework-agnostic package (or monorepo workspace) so other apps can consume the same router/interfaces without the storefront UI. Document required abstractions (product schema loading, metadata contract, account registry) and outline migration steps.
- [ ] **Implement Whop adapter** – after the reusable package plan lands, flesh out checkout + webhook normalization for Whop (redirects, fulfillments, metadata mapping) using the demo product as the first test case.
- [ ] **Implement Easy Pay Direct adapter** – once Whop is stable, add the Easy Pay Direct checkout + webhook flow so high-risk SKUs can be switched over with the same manifest/metadata structure.
- [ ] **Implement LemonSqueezy adapter** – lastly, build the LemonSqueezy adapter (checkout session creation, webhooks, metadata normalization) using the existing schema slots.

### 12. Verification & future providers
- [ ] **Manual sandbox drill** – Once PayPal wiring is ready, run through a full sandbox purchase on localhost, confirm Neon throwaway DB rows record `payment_provider = paypal`, and verify the GHL sync path.
- [ ] **Adapter templates for Whop / Easy Pay Direct / LemonSqueezy** – Copy the PayPal structure and stub out adapters for the remaining providers so future work only needs API-specific code.
- [ ] **QA reminder** – When functionality stabilizes and the user lifts the temporary restriction, run lint/typecheck/unit/axe/validate-products and Playwright headless desktop + mobile suites before merging.

### Deferred QA (run once functionality is locked)
- [ ] Add router/unit coverage for the adapter selector + alias handling (deferred; no tests while we iterate).
- [ ] Extend Playwright smoke coverage for an alternate-provider flow (headless desktop + mobile) once the adapters exist.
- [ ] Update Stripe integration tests to invoke the adapter API instead of the legacy helpers.

## Open Questions / Follow-ups
- How do we want to store credentials for non-Stripe providers (OAuth vs API keys)? The account registry should accommodate secrets stored in env or secret manager without checking them into git.
- Should webhook endpoints remain provider-specific (e.g., `/api/stripe/webhook`, `/api/whop/webhook`) or move to a single `/api/payments/webhook?provider=stripe` router? (Leaning provider-specific to avoid breaking existing Stripe webhook configuration.)
- When we onboard a non-Stripe provider, do we need to replicate optional items / order bumps immediately, or can we gate that behind provider capabilities?
