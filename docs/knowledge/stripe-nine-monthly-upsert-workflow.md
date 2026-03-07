# Stripe 9/mo Upsert Workflow (Store Product JSON)

Date: 2026-03-04

## Context

The existing `apps/store/scripts/stripe-migrate-create-products.ts` script can fail early if any live product is missing a `data/prices/manifest.json` entry, even when passing a single `--slug`.

## Working approach

1. Use a scoped script that only targets required slugs.
2. For each slug and each mode (live/test):
- Search Stripe product by `metadata.product_slug`.
- Create product if missing, otherwise update name/description/metadata.
- Ensure a recurring monthly USD 900 price exists (`recurring.interval = month`).
- Set the product `default_price` to that monthly price.
3. Write resulting product/price IDs to a local artifact under `tmp/`.
4. Update product JSONs:
- `payment.mode = "subscription"`
- `payment.stripe.price_id` / `test_price_id`
- `payment.stripe.metadata.stripe_product_id` / `stripe_test_product_id`
5. Update `apps/store/data/prices/manifest.json` with `mode: "subscription"`, `unit_amount: 900`, and live/test price IDs.

## Gotcha

When patching JSON text with regex, ensure `stripe_product_id` keys are written into `payment.stripe.metadata`, not into `optional_items`. Validate by re-reading payment blocks and running `pnpm lint` + `pnpm validate:products`.

## Exact route slugs

For exact storefront routes like `https://apps.serp.co/twitter-x-downloader`, the safest path is to create the product JSON file with the exact slug (`apps/store/data/products/twitter-x-downloader.json`) instead of trying to reuse a near-match such as `twitter-video-downloader`.

That keeps these systems aligned:

- file route slug
- `serply_link`
- Stripe product metadata `product_slug`
- manifest key in `apps/store/data/prices/manifest.json`
- GHL tag prefix and entitlement slug

If the route slug already matches the desired page URL, you do not need a `product_page_url` override.
