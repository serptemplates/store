# TODO: DRY + Refactor Roadmap

Ordered from lowest risk (top) to highest risk (bottom).

- [x] Consolidate manual test scripts into a single entrypoint with subcommands (no runtime impact)
  - Targets: `apps/store/scripts/manual-tests/*`

- [x] Centralize analytics config wiring (GTM/PostHog/Dub) behind a single helper or config adapter
  - Targets: `apps/store/components/DelayedGTM.tsx`, `apps/store/components/analytics/DubAnalytics.tsx`, `apps/store/components/analytics/PostHogAnalytics.tsx`, `apps/store/data/site.config.json`, `apps/store/lib/env-validation.ts`

- [x] Normalize store/directory base URL resolution (single source of truth for `apps` vs `store`)
  - Targets: `apps/store/lib/canonical-url.ts`, `apps/store/lib/urls.ts`, `apps/store/lib/products/offer-config.ts`, `apps/store/app/api/feeds/google-merchant/route.ts`, `scripts/google-merchant/export-feed.ts`, `scripts/google-merchant/upload-products.ts`

- [x] DRY product URL fields in product JSON (derive from slug + base URLs, keep true overrides only)
  - Targets: `apps/store/data/product.schema.json`, `apps/store/data/README.md`, `apps/store/lib/products/product-adapter.ts`, `apps/store/lib/products/offer-config.ts`

- [x] Isolate legacy payment/licensing flows behind explicit flags/modules
  - Targets: `apps/store/app/api/payments/paypal/webhook/route.ts`, `apps/store/lib/payments/providers/paypal/webhook.ts`, `apps/store/lib/license-service/creation.ts`, `apps/store/lib/account/license-sync.ts`

- [x] Prep directory vs store route split by centralizing public paths (no domain move)
  - Targets: `apps/store/lib/routes.ts`, `apps/store/lib/navigation.ts`, `apps/store/app/blog/*`, `apps/store/app/videos/*`, `apps/store/app/checkout/*`, `apps/store/app/account/*`, `apps/store/app/watch/*`
