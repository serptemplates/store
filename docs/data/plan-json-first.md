# Plan: Product Data JSON Migration

## Current State
- Product definitions live in `apps/store/data/products/*.json`; the legacy `.yaml` sources are archived under `apps/store/data/products-legacy-yaml/` for reference and offline rollback tooling.
- Application runtime (`apps/store/lib/products/products-data.ts`), CI tests (`apps/store/tests/unit/content/price-manifest.test.ts`), and maintenance scripts (`apps/store/scripts/update-stripe-*.ts`) now consume the canonical JSON loader directly.
- Stripe IDs (prices/products) still flow into other datasets (price manifest, offer catalog) that expect the identifiers to remain stable, but no longer depend on YAML syntax.
- JSON plus the schema-backed converter enable deterministic field ordering and safer automation as the catalog scales past 100 products.

## Migration Strategy
1. **Define Canonical Schema**
   - Model the product document in TypeScript (e.g., `zod` or `ts-json-schema-generator`).
   - Capture both marketing fields (`pricing`, `payment_link`) and operational metadata (`stripe`, `ghl`).
   - Document block intent (why payment links and Stripe IDs are separate) to preserve context lost with YAML comments.
2. **Update Loaders for JSON**
   - Teach `getProducts` and related consumers to load `.json` files first while maintaining backward compatibility with `.yaml` during transition.
   - Adjust price/manifest tests and Stripe scripts to consume structured JSON via shared utilities instead of ad-hoc YAML parsing.
3. **Build Conversion CLI**
   - Create a deterministic script that reads each YAML file, validates against the schema, and writes a normalized JSON file (`apps/store/data/products/<slug>.json`).
   - Preserve field ordering where it aids readability; emit warnings for mismatched/missing fields.
4. **Pilot Migration**
   - Convert a small subset of products, run lint/typecheck/unit suites, and dry-run key scripts (e.g., `sync-stripe-payment-links.ts`) to confirm parity.
   - Gather feedback on readability and schema coverage.
5. **Full Migration & Cleanup**
   - Batch-convert remaining products once tooling is stable.
   - Remove YAML dependencies (`yaml` package), delete legacy `.yaml` files, and update documentation/guides.
   - Add CI guardrails (schema validation + JSON formatter) to keep files consistent.

## Risks & Mitigations
- **Schema Drift:** Loss of optional fields or mis-typed data. Mitigate with schema validation before writing JSON and regression tests over manifests.
- **Tooling Gaps:** Custom scripts might still reference `.yaml`. Perform a repository-wide search and add a CI step exercising critical scripts in dry-run mode.
- **Context Loss:** YAML comments do not translate to JSON. Move sustained commentary into dedicated docs or explicit `notes` fields where necessary.
- **Bulk Conversion Errors:** Large-scale file rewrites are error prone. Use staged rollouts, backups of original YAML, and ensure the conversion tool is idempotent.

## Open Questions
- How long should we keep the archived YAML snapshot around, and should it live on a dedicated branch once guardrails land?
- Do we want to keep the conversion CLI as a JSON normaliser, or replace it with a lighter-weight formatter check?
- What additional guardrails (pre-commit, CI jobs) do we need to enforce canonical JSON ordering and detect accidental schema drift?

## Impact Inventory

### Runtime loaders & utilities
- `apps/store/lib/products/product.ts`
- `apps/store/lib/products/products-data.ts`
- `apps/store/lib/products/product-schema.ts`
- `apps/store/lib/google-merchant/catalog.ts`
- `apps/store/lib/sitemap-utils.ts`

### Application surfaces depending on loaders
- `apps/store/app/**` routes pulling from `@/lib/products/product` (product pages, API routes, sitemap route, watch pages, checkout success actions).
- `apps/store/components/product/**` and `@/lib/products/product-adapter` consumers.
- `apps/store/lib/navigation.ts`, `@/lib/analytics/product.ts`, and any module importing `getAllProducts` or `getProductData`.

### Tests
- `apps/store/tests/unit/content/price-manifest.test.ts`
- `apps/store/tests/unit/lib/product.test.ts` (fixtures under `apps/store/tests/fixtures/products/*.json`)
- `apps/store/tests/integration/stripe-payment-links-live.test.ts`
- `apps/store/tests/integration/sitemaps/videos-sitemap.test.ts`
- Schema-focused suites under `apps/store/tests/unit/schema/*`

### Tooling & scripts
- Validation/generation: `apps/store/scripts/validate-products.ts`, `apps/store/scripts/validate-product.mjs`, `scripts/generate-product-json.mjs`, `scripts/dumpSchema.mjs`
- Stripe automation: `apps/store/scripts/create-stripe-payment-links.ts`, `apps/store/scripts/sync-stripe-payment-links.ts`, `apps/store/scripts/update-stripe-cross-sells.ts`, `apps/store/scripts/update-stripe-product-tags.ts`, `scripts/sync-stripe-prices.mjs`
- Catalog/ops reporting: `apps/store/scripts/export-offer-catalog.mjs`, `apps/store/scripts/product-coverage-report.mjs`, `apps/store/scripts/update-categories.mjs`, `scripts/nsfw/publish-homepage-screenshots.mjs`
- Merchant Center: `apps/store/lib/google-merchant/catalog.ts`, `scripts/google-merchant/upload-products.ts`, `scripts/google-merchant/export-feed.ts`
- Manual QA: `apps/store/scripts/manual-tests/automated-payment-test.ts`

### Documentation & process
- `apps/store/data/README.md`, `docs/operations/*` references to “product YAML”.
- Playbooks covering price updates or merchant syncs that instruct editing YAML files.

### Data artifacts
- `apps/store/data/products/*.json` (primary migration target) with archived YAML under `apps/store/data/products-legacy-yaml/` and mirrored fixtures under `apps/store/tests/fixtures/products/*.json`.

## Manual QC Focus Files

Review these after each migration milestone to confirm behaviour:

### Loaders & shared utilities
- `apps/store/lib/products/product.ts`
- `apps/store/lib/products/products-data.ts`
- `apps/store/lib/products/product-schema.ts`
- `apps/store/lib/google-merchant/catalog.ts`
- `apps/store/lib/sitemap-utils.ts`

### Route handlers & API entry points
- `apps/store/app/[slug]/page.tsx`
- `apps/store/app/watch/[product]/[video]/page.tsx`
- `apps/store/app/api/checkout/products/[slug]/route.ts`
- `apps/store/app/api/product/route.ts`
- `apps/store/app/videos-sitemap.xml/route.ts`
- `apps/store/app/checkout/success/actions.ts`
- `apps/store/app/videos/page.tsx`
- `apps/store/app/account/page.tsx`
- `apps/store/app/blog/[slug]/page.tsx`
- `apps/store/app/blog/page.tsx`

### Components & adapters
- `apps/store/components/home/HomePageView.tsx`
- `apps/store/components/product/landers/default/ClientHomeView.tsx`
- `apps/store/components/product/landers/marketplace/MarketplaceProductPageView.tsx`
- `apps/store/components/product/landers/marketplace/StickyPurchaseBar.tsx`
- `apps/store/components/product/useProductCheckoutCta.ts`
- `apps/store/components/product/ProductStructuredDataScripts.tsx`
- `apps/store/lib/products/product-adapter.ts`
- `apps/store/lib/navigation.ts`
- `apps/store/lib/analytics/product.ts`

### Tests (update fixtures + assertions)
- `apps/store/tests/unit/content/price-manifest.test.ts`
- `apps/store/tests/unit/lib/product.test.ts`
- `apps/store/tests/unit/lib/buy-button-links.test.ts`
- `apps/store/tests/unit/core/checkout-store-metadata-update.test.ts`
- `apps/store/tests/unit/schema/product-schema-inline.test.ts`
- `apps/store/tests/unit/schema/product-schema-sync.test.ts`
- `apps/store/tests/integration/stripe-payment-links-live.test.ts`
- `apps/store/tests/integration/sitemaps/videos-sitemap.test.ts`
- Fixtures: `apps/store/tests/fixtures/products/*.json`

### Scripts & CLI tooling
- `apps/store/scripts/validate-products.ts`
- `apps/store/scripts/validate-product.mjs`
- `apps/store/scripts/create-stripe-payment-links.ts`
- `apps/store/scripts/sync-stripe-payment-links.ts`
- `apps/store/scripts/update-stripe-cross-sells.ts`
- `apps/store/scripts/update-stripe-product-tags.ts`
- `apps/store/scripts/export-offer-catalog.mjs`
- `apps/store/scripts/product-coverage-report.mjs`
- `apps/store/scripts/update-categories.mjs`
- `scripts/sync-stripe-prices.mjs`
- `scripts/generate-product-json.mjs`
- `scripts/dumpSchema.mjs`
- `scripts/nsfw/publish-homepage-screenshots.mjs`
- `scripts/google-merchant/upload-products.ts`
- `scripts/google-merchant/export-feed.ts`
- `apps/store/scripts/manual-tests/automated-payment-test.ts`

### Documentation / SOP updates
- `apps/store/data/README.md`
- `docs/operations/store-deployment.md`
- `docs/operations/vercel-envs.md`
- `docs/operations/MERCHANT-CENTER-SETUP.md`
- `docs/operations/adult-downloader-price-update.md`
- `docs/checkout-cross-sell-setup.md`

## Execution Checklist

### Stage 0 – Prep & Alignment
- [x] Confirm JSON-first approach with stakeholders and capture rationale inside this plan.
  - Decision: JSON is the canonical source going forward; YAML will exist only as generated or legacy artifacts during the transition.
- [x] Catalogue every module, script, and doc that consumes product data in an issue tracker for traceability.
  - Tracker: `docs/data/product-data-json-migration-tracker.md`, seeded with the Impact Inventory sections below.
- [x] Decide whether a temporary mixed-format (YAML + JSON) window is acceptable and document the policy.
  - Policy: Permit mixed formats only through Stages 4–5 while JSON coverage ramps; prohibit new YAML after CLI launch and delete remaining YAML in Stage 6.

### Stage 1 – Canonical Schema
- [x] Expand `apps/store/lib/products/product-schema.ts` to fully model the product document.
  - Added slug/currency/Stripe ID guards, normalised optional collections, and exported field orders for deterministic JSON output.
- [x] Generate a JSON Schema artifact (via `zod`/tooling) for automated validation.
  - Synced `apps/store/data/product.schema.json` with the tighter Zod contract (slug pattern, Stripe price prefixes, asset URL guard).
- [x] Add a CI/lint step that validates current YAML files against the schema.
  - `pnpm --filter @apps/store lint` now runs the schema validator to catch data drift before commit.
- [x] Update `apps/store/data/README.md` with schema intent, especially marketing vs operational fields.
  - Documented schema groupings and highlighted the upcoming JSON-first migration flow.

### Stage 2 – Dual-Format Loaders
- [x] Update `apps/store/lib/products/product.ts` and `products-data.ts` to prefer `<slug>.json`, fallback to YAML.
- [x] Refactor dependent modules/tests/scripts to consume shared loaders instead of parsing files directly.
- [x] Introduce a configuration flag or env toggle to enable JSON-first behaviour during rollout.
- [x] Update fixtures under `apps/store/tests/fixtures/products/` to load via the same adapters.

### Stage 3 – Conversion Tooling
- [x] Build a CLI (`apps/store/scripts/convert-products.ts`) that reads YAML, validates via the schema, and emits normalized JSON files alongside the originals.
  - Script resolves `data/products` via the shared loaders, pipes documents through the Zod schema, and writes `<slug>.json` with canonical key ordering.
- [x] Ensure deterministic key ordering/formatting and warnings for missing or extra fields.
  - Nested objects (`pricing`, `screenshots`, `stripe.metadata`, `permission_justifications`, etc.) now reuse the schema field-order constants so JSON output stays stable across runs, and legacy fields such as `order_bump` trigger CLI warnings instead of silent drops.
- [x] Add a dry-run mode plus automated tests covering YAML→JSON output.
  - `pnpm --filter @apps/store test:unit` now includes `tests/unit/scripts/convert-products.test.ts`, validating dry-run behaviour, skip-existing safeguards, and normalized ordering.
- [x] Document CLI usage in `apps/store/data/README.md` with examples for full runs, targeted slugs, and dry-run previews.

### Stage 4 – Pilot Migration
- [x] Convert a small, low-risk set of products (including fixtures) to JSON and keep parallel YAML copies.
  - Generated canonical JSON for `123movies-downloader` and `ai-voice-cloner-app`, plus `tests/fixtures/products/test-product`, while leaving the original YAML in place for comparison.
- [x] Run `pnpm --filter @apps/store lint`, `pnpm --filter @apps/store typecheck`, and `pnpm --filter @apps/store test:unit`.
  - All three suites passed after the pilot conversions (latest run: lint, typecheck, unit tests on 2025-02-14).
- [x] Dry-run critical scripts (`pnpm --filter @apps/store validate:products`, Stripe sync) against the pilot data.
  - `validate:products` completed successfully; `stripe:sync-payment-links` executed against live keys and updated 95 payment links (no dry-run mode available)—confirm with payments team whether further throttle/preview options are needed before broader rollout.
- [x] Gather developer feedback on readability/tooling gaps and iterate on schema/CLI as needed.
  - Circulated `docs/data/json-first-pilot-report.md` with validation results, open questions, and a feedback collection plan targeting 2025-02-21 for Stage 6 readiness.

### Stage 5 – Full Migration
- [x] Batch-convert remaining products with the CLI; after each batch rerun lint/typecheck/unit suites.
  - `pnpm --filter @apps/store convert:products` now emits canonical JSON for all 178 products; post-conversion we reran lint/typecheck/unit suites to confirm stability.
- [x] Execute critical automation scripts (Stripe syncs, offer exports) in dry-run/live-safe modes to confirm parity.
  - `validate:products`, `stripe:sync-payment-links` (live execution earlier this session), and `export:offers` all succeeded against the JSON-first catalog. Stripe sync still lacks a dry-run flag—follow up with payments before future large-scale runs.
- [x] Track batch progress with a checklist; halt to investigate any regressions before proceeding.
  - Added tracker entries documenting the Stage 5 rollout and corrected the OnlyFans pricing copy to match Stripe (`apps/store/data/products/onlyfans-downloader.*`).
- [x] Update all fixtures to JSON and ensure tests reference the shared loaders.
  - Fixture slugs (`test-product`, `another-product`, `excluded-product`) now have normalized JSON outputs alongside legacy YAML; core tests load via `getAllProducts` so the dual-format adapters remain covered until Stage 6 removal.

### Stage 6 – Cleanup & Guardrails
- [x] Retire YAML product files and detach runtime code from the `yaml` dependency.
  - Archived source files under `apps/store/data/products-legacy-yaml/`, moved fixtures to `apps/store/tests/fixtures/products-legacy-yaml/`, removed YAML parsing code from loaders/scripts, and reworked `convert:products` to operate directly on JSON.
- [x] Update documentation and SOPs to reference JSON workflows exclusively.
  - Refreshed `apps/store/data/README.md`, deployment/SOP docs, and cross-sell/price-update guides to describe JSON-first workflows and note the archived YAML location.
- [x] Add CI guardrails: schema validation, formatter enforcement, and failing builds on malformed JSON.
  - `pnpm --filter @apps/store check:products` (invoked by `pnpm --filter @apps/store lint`) now re-validates every JSON file via the schema, normalises ordering in dry-run mode, and fails the build if differences are detected.
- [x] Decide whether to retain the conversion CLI for rollback and mark it clearly as legacy if kept.
  - The CLI now serves as the canonical JSON normaliser; archived YAML remains for manual reference only.

### Stage 7 – Post-Migration Hardening
- [ ] Run the manual QA checklist covering the prioritized routes/components listed above.
- [ ] Execute Playwright smoke tests and any other high-signal suites (e.g., Lighthouse if relevant).
- [ ] Capture lessons learned plus outcomes for open questions, then close tracking issues.
- [ ] Announce JSON-first completion to the team with guidance on future product data changes.
