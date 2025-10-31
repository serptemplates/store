# Product Content Contract

- Every product lander now lives in `data/products/<slug>.json`. The filename minus extension becomes the route slug (`/<slug>`), and must stay lowercase with hyphens only.
- Archived `.yaml` sources are stored under `data/products-legacy-yaml/` for reference and can be fed into the converter if we ever need to regenerate JSON.
- The canonical schema is `product.schema.json`, generated from the Zod definition in `@/lib/products/product-schema.ts`. Marketing surfaces (copy, media, FAQs, reviews) and operational metadata (Stripe, GoHighLevel, licensing, return policy) are documented there so every consumer shares the same contract.
- Validate your content with `pnpm --filter @apps/store validate:content` (now part of `pnpm --filter @apps/store lint`). The validator normalises null/empty values, enforces URL host allow-lists, and ensures rating/currency fields stay within bounds.
- Normalise or regenerate product JSON with `pnpm --filter @apps/store convert:products`. The CLI validates each document via the shared schema, warns about unsupported fields, and rewrites `<slug>.json` with canonical field ordering. Run `pnpm --filter @apps/store check:products` (invoked automatically during `pnpm --filter @apps/store lint`) to ensure every file already matches the canonical formatting. Archived `.yaml` sources remain under `data/products-legacy-yaml/` for historical reference.
- Check marketing coverage with `pnpm --filter @apps/store report:coverage`. The report highlights which product files are missing features, media, FAQs, and other key sections from the shared template.
- Export the full offer catalog to CSV with `pnpm --filter @apps/store export:offers` (output: `docs/offer-catalog.csv`).
- Hide products from this site by adding their slugs to `data/site.config.json` under `excludeSlugs`.
- Dev server routing: `http://localhost:3000/` redirects to the first product slug. Hit `http://localhost:3000/<slug>` to preview a specific product. Adding a new JSON file makes its page available immediately at that path.
- Optionally, run `pnpm --filter @apps/store typecheck` to ensure TypeScript stays happy after schema or template changes.

## Schema groups

- **Identity & SEO** – `platform`, `slug`, `name`, `tagline`, `description`, `seo_title`, `seo_description`, and canonical URLs (`serply_link`, `apps_serp_co_product_page_url`, `store_serp_co_product_page_url`, optional `serp_co_product_page_url`). URL hosts are locked down so broken redirects fail validation early.
- **Marketing surfaces** – `features`, `pricing`, `screenshots`, `product_videos`, `related_videos`, `related_posts`, `faqs`, `reviews`, and optional badges (`featured`, `new_release`, `popular`). Currency codes are auto-uppercased and constrained to ISO 4217; review ratings must sit between 0–5.
- **Commerce & fulfilment** – `payment_link`, `stripe`, `ghl`, `license`, `return_policy`, and `permission_justifications`. Stripe IDs must start with `price_`, and GoHighLevel lists normalise empty/null values to arrays.
- **Navigation & taxonomy** – `categories`, `keywords`, `supported_operating_systems`, `supported_regions`, `github_repo_tags`, plus optional `brand`, `sku`, and `waitlist_url`.

## Conversion CLI

- Default run: `pnpm --filter @apps/store convert:products`. JSON output uses the deterministic field order defined in `@/lib/products/product-schema.ts`.
- Preview changes with `--dry-run` to see which files would change without writing to disk. The summary marks already-normalised products as skipped.
- Limit the scope with `--slug <slug>` (repeatable). Add `--skip-existing` if you want to examine diffs without overwriting existing JSON yet.
- The CLI surfaces warnings whenever it encounters legacy fields (such as `order_bump`) or when the product slug inside the YAML no longer matches the filename—fix these before moving on to the pilot migration.

## Cross-sell configuration

- Stripe cross-sells are now configured directly in the Stripe Dashboard. The storefront no longer reads `order_bump` YAML blocks.
- Remove legacy `order_bump` entries from product files as you touch them; they have no effect on the hosted checkout flow.
- See `docs/checkout-cross-sell-setup.md` for the updated cross-sell playbook and cleanup checklist.

## Product media assets

- Product screenshots, featured images, and hero thumbnails can now be served from the repo instead of hot-linking to GitHub.
- Store shared assets under `apps/store/public/media/products/<slug>/`. Any file in `public` is exposed at runtime, so `/media/products/beeg-video-downloader/featured.svg` becomes `https://apps.serp.co/media/products/beeg-video-downloader/featured.svg` in production.
- In the product JSON, set `featured_image`, `featured_image_gif`, and `screenshots[].url` to either an absolute URL or a root-relative path. The build pipeline normalises relative paths, adds the site origin when needed (e.g. Google Merchant feeds, JSON-LD), and keeps remote URLs untouched.
- Local assets are rendered with `next/image` but marked `unoptimized`, so Next.js will serve them exactly as committed. Optimise and compress images before adding them (JPEG/WebP recommended, max width ~1600px) to avoid regressions in build size or CLS.
- Prefer WebP for new uploads when possible. You can convert existing JPEGs with `cwebp -q 70 -m 6 input.jpg -o output.webp` to keep quality high while shrinking payload size.
- Avoid using `../` in asset paths—stick to absolute `/media/...` references so the same value works locally, in staging, and on production.

## Price manifest

- Canonical Stripe amounts live in `data/prices/manifest.json`. Each entry maps a Stripe price ID (and optional compare-at amount) to a currency + unit amount in cents.
- The manifest is consumed by the landers, checkout helpers, and Google Merchant feed; all display pricing now resolves from this file instead of the YAML copy.
- Regenerate the manifest with `pnpm --filter @apps/store validate:products`. When `STRIPE_SECRET_KEY` is configured the script will fetch fresh amounts before validation.
- If a price ID is missing from the manifest, the app falls back to the product JSON `pricing.price` string—useful while we backfill entries—but add the mapping to keep Stripe and the landers in sync.
