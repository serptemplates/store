# Product Data Migration Tracker

Use this checklist to track JSON migration updates across code, tests, scripts, and documentation. Mark each item when the consumer has been updated to rely on the canonical JSON schema/loaders.

## Runtime loaders & utilities
- [x] `apps/store/lib/products/product.ts`
- [x] `apps/store/lib/products/products-data.ts`
- [ ] `apps/store/lib/products/product-schema.ts`
- [x] `apps/store/lib/google-merchant/catalog.ts`
- [x] `apps/store/lib/sitemap-utils.ts`

## Application surfaces
- [ ] `apps/store/app/[slug]/page.tsx`
- [ ] `apps/store/app/watch/[product]/[video]/page.tsx`
- [ ] `apps/store/app/api/checkout/products/[slug]/route.ts`
- [ ] `apps/store/app/api/product/route.ts`
- [ ] `apps/store/app/videos-sitemap.xml/route.ts`
- [ ] `apps/store/app/checkout/success/actions.ts`
- [ ] `apps/store/app/videos/page.tsx`
- [ ] `apps/store/app/account/page.tsx`
- [ ] `apps/store/app/blog/[slug]/page.tsx`
- [ ] `apps/store/app/blog/page.tsx`

## Components & adapters
- [ ] `apps/store/components/home/HomePageView.tsx`
- [ ] `apps/store/components/product/landers/default/ClientHomeView.tsx`
- [ ] `apps/store/components/product/landers/marketplace/MarketplaceProductPageView.tsx`
- [ ] `apps/store/components/product/shared/ProductStickyBar.tsx`
- [ ] `apps/store/components/product/useProductCheckoutCta.ts`
- [ ] `apps/store/components/product/ProductStructuredDataScripts.tsx`
- [ ] `apps/store/lib/products/product-adapter.ts`
- [ ] `apps/store/lib/navigation.ts`
- [ ] `apps/store/lib/analytics/product.ts`

## Tests & fixtures
- [x] `apps/store/tests/unit/content/price-manifest.test.ts`
- [ ] `apps/store/tests/unit/lib/product.test.ts`
- [ ] `apps/store/tests/unit/lib/buy-button-links.test.ts`
- [ ] `apps/store/tests/unit/core/checkout-store-metadata-update.test.ts`
- [ ] `apps/store/tests/unit/schema/product-schema-inline.test.ts`
- [ ] `apps/store/tests/unit/schema/product-schema-sync.test.ts`
- [x] `apps/store/tests/integration/stripe-payment-links-live.test.ts`
- [ ] `apps/store/tests/integration/sitemaps/videos-sitemap.test.ts`
- [x] `apps/store/tests/fixtures/products/*.json`

## Scripts & CLI tooling
- [x] `apps/store/scripts/validate-products.ts`
- [x] `apps/store/scripts/convert-products.ts`
- [x] `apps/store/scripts/validate-product.mjs`
- [x] `apps/store/scripts/create-stripe-payment-links.ts`
- [x] `apps/store/scripts/sync-stripe-payment-links.ts`
- [x] `apps/store/scripts/update-stripe-cross-sells.ts`
- [x] `apps/store/scripts/update-stripe-product-tags.ts`
- [x] `apps/store/scripts/export-offer-catalog.mjs`
- [x] `apps/store/scripts/product-coverage-report.mjs`
- [x] `apps/store/scripts/update-categories.mjs`
- [x] `scripts/sync-stripe-prices.mjs`
- [x] `scripts/generate-product-json.mjs`
- [x] `scripts/dumpSchema.mjs`
- [x] `scripts/nsfw/publish-homepage-screenshots.mjs`
- [ ] `scripts/google-merchant/upload-products.ts`
- [ ] `scripts/google-merchant/export-feed.ts`
- [x] `apps/store/scripts/manual-tests/automated-payment-test.ts`

## Documentation / SOPs
- [x] `apps/store/data/README.md`
- [x] `docs/operations/store-deployment.md`
- [x] `docs/operations/vercel-envs.md`
- [x] `docs/operations/MERCHANT-CENTER-SETUP.md`
- [x] `docs/operations/adult-downloader-price-update.md`
- [x] `docs/checkout-cross-sell-setup.md`

## Stage 4 Pilot Coverage
- [x] `data/products/123movies-downloader.json` (pilot)
- [x] `data/products/ai-voice-cloner-app.json` (pilot)
- [x] `tests/fixtures/products/test-product.json` (pilot)
- [x] Pilot report circulated (`docs/data/json-first-pilot-report.md`)

## Stage 5 Conversion Status
- [x] Full catalog converted with `pnpm --filter @apps/store convert:products` (178 products).
- [x] Fixture parity: `another-product.json`, `excluded-product.json`, and `test-product.json` generated via CLI.
- [x] Post-conversion validation: lint, typecheck, unit tests, and `pnpm --filter @apps/store validate:products` all pass.
- [x] Downstream scripts checked: `pnpm --filter @apps/store stripe:sync-payment-links` (live run) and `pnpm --filter @apps/store export:offers`.
