# Product Content Contract

- Every product lander lives in its own YAML file under `data/products/*.yaml`. The filename (minus extension) is automatically used as the URL slug (`/<slug>`).
- The shared schema is defined in `product.schema.json`. When you add new fields to the template, update this schema once so all products inherit the contract.
- Validate your content with `pnpm --filter @apps/store validate:content`. This script iterates every YAML file and prints any schema violations with field-level error details.
- Check marketing coverage with `pnpm --filter @apps/store report:coverage`. The report highlights which product files are missing features, media, FAQs, and other key sections from the shared template.
- Export the full offer catalog to CSV with `pnpm --filter @apps/store export:offers` (output: `docs/offer-catalog.csv`).
- Hide products from this site by adding their slugs to `data/site.config.json` under `excludeSlugs`.
- Dev server routing: `http://localhost:3000/` redirects to the first product slug. Hit `http://localhost:3000/<slug>` to preview a specific product. Adding a new YAML file makes its page available immediately at that path.
- Optionally, run `pnpm --filter @apps/store typecheck` to ensure TypeScript stays happy after schema or template changes.

## Cross-sell configuration

- Stripe cross-sells are now configured directly in the Stripe Dashboard. The storefront no longer reads `order_bump` YAML blocks.
- Remove legacy `order_bump` entries from product files as you touch them; they have no effect on the hosted checkout flow.
- See `docs/checkout-cross-sell-setup.md` for the updated cross-sell playbook and cleanup checklist.

## Product media assets

- Product screenshots, featured images, and hero thumbnails can now be served from the repo instead of hot-linking to GitHub.
- Store shared assets under `apps/store/public/media/products/<slug>/`. Any file in `public` is exposed at runtime, so `/media/products/beeg-video-downloader/featured.svg` becomes `https://apps.serp.co/media/products/beeg-video-downloader/featured.svg` in production.
- In the YAML, set `featured_image`, `featured_image_gif`, and `screenshots[].url` to either an absolute URL or a root-relative path. The build pipeline normalises relative paths, adds the site origin when needed (e.g. Google Merchant feeds, JSON-LD), and keeps remote URLs untouched.
- Local assets are rendered with `next/image` but marked `unoptimized`, so Next.js will serve them exactly as committed. Optimise and compress images before adding them (JPEG/WebP recommended, max width ~1600px) to avoid regressions in build size or CLS.
- Prefer WebP for new uploads when possible. You can convert existing JPEGs with `cwebp -q 70 -m 6 input.jpg -o output.webp` to keep quality high while shrinking payload size.
- Avoid using `../` in asset paths—stick to absolute `/media/...` references so the same value works locally, in staging, and on production.

## Price manifest

- Canonical Stripe amounts live in `data/prices/manifest.json`. Each entry maps a Stripe price ID (and optional compare-at amount) to a currency + unit amount in cents.
- The manifest is consumed by the landers, checkout helpers, and Google Merchant feed; all display pricing now resolves from this file instead of the YAML copy.
- Regenerate the manifest with `pnpm --filter @apps/store validate:products`. When `STRIPE_SECRET_KEY` is configured the script will fetch fresh amounts before validation.
- If a price ID is missing from the manifest, the app falls back to the legacy YAML strings—useful while we backfill entries—but add the mapping to keep Stripe and the landers in sync.
