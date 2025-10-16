# Product Content Contract

- Every product lander lives in its own YAML file under `data/products/*.yaml`. The filename (minus extension) is automatically used as the URL slug (`/<slug>`).
- The shared schema is defined in `product.schema.json`. When you add new fields to the template, update this schema once so all products inherit the contract.
- Validate your content with `pnpm --filter @apps/store validate:content`. This script iterates every YAML file and prints any schema violations with field-level error details.
- Check marketing coverage with `pnpm --filter @apps/store report:coverage`. The report highlights which product files are missing features, media, FAQs, and other key sections from the shared template.
- Export the full offer catalog to CSV with `pnpm --filter @apps/store export:offers` (output: `docs/offer-catalog.csv`).
- Export domains and primary URLs for each deployed site with `pnpm --filter @apps/store export:domains` (output: `docs/domain-inventory.csv`).
- Hide products from this site by adding their slugs to `data/site.config.json` under `excludeSlugs`.
- Dev server routing: `http://localhost:3000/` redirects to the first product slug. Hit `http://localhost:3000/<slug>` to preview a specific product. Adding a new YAML file makes its page available immediately at that path.
- Optionally, run `pnpm --filter @apps/store typecheck` to ensure TypeScript stays happy after schema or template changes.

## Order bump / upsell configuration

- Shared upsells live under `data/order-bumps/*.yaml`. Each file contains the canonical copy, talking points, and Stripe price metadata for that upsell.
- In a product YAML, reference a shared upsell with `order_bump: <slug>`. Provide an object with overrides (`description`, `features`, `default_selected`, etc.) when a lander needs tweaks.
- Unique, service-style bumps can still be defined inline by supplying the same fields (`title`, `price`, `stripe.price_id`, …) directly in the product’s `order_bump` block.
- Create matching Stripe Prices **before** a deploy. See `docs/upsell-payment-setup.md` for the full payment checklist.
- PayPal totals piggyback on the upsell price string. Keep it formatted like `$29` or `$29.00`; the checkout route strips currency symbols automatically.
- Validate changes with `pnpm --filter @apps/store validate:products`. The script now checks that referenced upsell slugs exist under `data/order-bumps/`.
- If an upsell is **not** defined, checkout continues to function; the tests in `tests/api/checkout-session.test.ts` cover both “no upsell” and “upsell present but unselected” flows.

## Price manifest

- Canonical Stripe amounts live in `data/prices/manifest.json`. Each entry maps a Stripe price ID (and optional compare-at amount) to a currency + unit amount in cents.
- The manifest is consumed by the landers, checkout APIs, PayPal flow, and Google Merchant feed; all display pricing now resolves from this file instead of the YAML copy.
- Regenerate the manifest with `pnpm --filter @apps/store validate:products`. When `STRIPE_SECRET_KEY` is configured the script will fetch fresh amounts before validation.
- If a price ID is missing from the manifest, the app falls back to the legacy YAML strings—useful while we backfill entries—but add the mapping to keep Stripe, PayPal, and the landers in sync.
