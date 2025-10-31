# Plan: Product Data JSON Migration

## Current State
- Product definitions live in `apps/store/data/products/*.yaml`.
- Application runtime (`apps/store/lib/products/products-data.ts`), CI tests (`apps/store/tests/unit/content/price-manifest.test.ts`), and maintenance scripts (`apps/store/scripts/update-stripe-*.ts`) compile and validate these YAML files.
- Stripe IDs (prices/products) flow into other datasets (price manifest, offer catalog) that expect the identifiers to remain stable but do not depend on YAML syntax.
- YAML encourages inline comments and ad-hoc structure, making automated edits brittle as the catalog scales past 100 products.

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
- Should we keep a single mixed-format window (YAML + JSON) in the repo, or require JSON-only once the CLI lands?
- Do we need a shared formatter/prettier config to guarantee deterministic key ordering and whitespace?
- Is there value in combining `payment_link` and `stripe` blocks once everything shares the schema, or should we retain them for clarity?

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
- `apps/store/tests/unit/lib/product.test.ts` (fixtures under `apps/store/tests/fixtures/products/*.yaml`)
- `apps/store/tests/integration/stripe-payment-links-live.test.ts`
- `apps/store/tests/integration/sitemaps/videos-sitemap.test.ts`
- Schema-focused suites under `apps/store/tests/unit/schema/*`

### Tooling & scripts
- Validation/generation: `apps/store/scripts/validate-products.ts`, `apps/store/scripts/validate-product.mjs`, `scripts/generate-product-yamls.mjs`, `scripts/dumpSchema.mjs`
- Stripe automation: `apps/store/scripts/create-stripe-payment-links.ts`, `apps/store/scripts/sync-stripe-payment-links.ts`, `apps/store/scripts/update-stripe-cross-sells.ts`, `apps/store/scripts/update-stripe-product-tags.ts`, `scripts/sync-stripe-prices.mjs`
- Catalog/ops reporting: `apps/store/scripts/export-offer-catalog.mjs`, `apps/store/scripts/product-coverage-report.mjs`, `apps/store/scripts/update-categories.mjs`, `scripts/nsfw/publish-homepage-screenshots.mjs`
- Merchant Center: `apps/store/lib/google-merchant/catalog.ts`, `scripts/google-merchant/upload-products.ts`, `scripts/google-merchant/export-feed.ts`
- Manual QA: `apps/store/scripts/manual-tests/automated-payment-test.ts`

### Documentation & process
- `apps/store/data/README.md`, `docs/operations/*` references to “product YAML”.
- Playbooks covering price updates or merchant syncs that instruct editing YAML files.

### Data artifacts
- `apps/store/data/products/*.yaml` (primary migration target) and mirrored fixtures under `apps/store/tests/fixtures/products/*.yaml`.

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
- Fixtures: `apps/store/tests/fixtures/products/*.yaml`

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
- `scripts/generate-product-yamls.mjs`
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
- [ ] Confirm JSON-first approach with stakeholders and capture rationale inside this plan.
- [ ] Catalogue every module, script, and doc that consumes product data in an issue tracker for traceability.
- [ ] Decide whether a temporary mixed-format (YAML + JSON) window is acceptable and document the policy.

### Stage 1 – Canonical Schema
- [ ] Expand `apps/store/lib/products/product-schema.ts` to fully model the product document.
- [ ] Generate a JSON Schema artifact (via `zod`/tooling) for automated validation.
- [ ] Add a CI/lint step that validates current YAML files against the schema.
- [ ] Update `apps/store/data/README.md` with schema intent, especially marketing vs operational fields.

### Stage 2 – Dual-Format Loaders
- [ ] Update `apps/store/lib/products/product.ts` and `products-data.ts` to prefer `<slug>.json`, fallback to YAML.
- [ ] Refactor dependent modules/tests/scripts to consume shared loaders instead of parsing files directly.
- [ ] Introduce a configuration flag or env toggle to enable JSON-first behaviour during rollout.
- [ ] Update fixtures under `apps/store/tests/fixtures/products/` to load via the same adapters.

### Stage 3 – Conversion Tooling
- [ ] Build a CLI (e.g., `apps/store/scripts/convert-products.ts`) that reads YAML, validates via the schema, and emits normalized JSON.
- [ ] Ensure deterministic key ordering/formatting and warnings for missing or extra fields.
- [ ] Add a dry-run mode plus automated tests covering YAML→JSON (and optional JSON→YAML rollback).
- [ ] Document CLI usage in `docs/data/plan-json-first.md` or `apps/store/data/README.md`.

### Stage 4 – Pilot Migration
- [ ] Convert a small, low-risk set of products (including fixtures) to JSON and keep parallel YAML copies.
- [ ] Run `pnpm --filter @apps/store lint`, `pnpm --filter @apps/store typecheck`, and `pnpm --filter @apps/store test:unit`.
- [ ] Dry-run critical scripts (`pnpm --filter @apps/store validate:products`, Stripe sync) against the pilot data.
- [ ] Gather developer feedback on readability/tooling gaps and iterate on schema/CLI as needed.

### Stage 5 – Full Migration
- [ ] Batch-convert remaining products with the CLI; after each batch rerun lint/typecheck/unit suites.
- [ ] Execute critical automation scripts (Stripe syncs, offer exports) in dry-run/live-safe modes to confirm parity.
- [ ] Track batch progress with a checklist; halt to investigate any regressions before proceeding.
- [ ] Update all fixtures to JSON and ensure tests reference the shared loaders.

### Stage 6 – Cleanup & Guardrails
- [ ] Remove YAML product files and drop the `yaml` dependency once JSON coverage is complete.
- [ ] Update documentation and SOPs to reference JSON workflows exclusively.
- [ ] Add CI guardrails: schema validation, formatter enforcement, and failing builds on malformed JSON.
- [ ] Decide whether to retain the conversion CLI for rollback and mark it clearly as legacy if kept.

### Stage 7 – Post-Migration Hardening
- [ ] Run the manual QA checklist covering the prioritized routes/components listed above.
- [ ] Execute Playwright smoke tests and any other high-signal suites (e.g., Lighthouse if relevant).
- [ ] Capture lessons learned plus outcomes for open questions, then close tracking issues.
- [ ] Announce JSON-first completion to the team with guidance on future product data changes.
