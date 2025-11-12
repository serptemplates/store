# Trademark Compliance Checklist

We gate every trademark-referencing product through a single set of helpers so the UI, SEO metadata, and legal copy stay in sync.

## Runtime Rules

1. Set `product.trademark_metadata.uses_trademarked_brand = true` for every product that references an external brand. Provide `trade_name` and `legal_entity` when known.
2. Always derive titles/descriptions through `apps/store/lib/products/unofficial-branding.ts`:
   - `resolveSeoTitle(product, product.seo_title)` adds `(Unofficial)` before the first pipe segment.
   - `resolveSeoDescription(product)` prepends `ProductName (Unofficial). Authorized-use only — download content you own or have permission to access.` **only** when the product uses a trademarked brand.
3. Render disclaimers via `@repo/ui/components/trademark-disclaimer`. This keeps the copy identical in the hero footnote, CTA terms, sticky bars, or any future placements and automatically appends the “All trademarks are property…” sentence.

## Enforcement

- Unit coverage lives in `apps/store/tests/unit/lib/unofficial-branding.test.ts`, `apps/store/tests/unit/lib/product-metadata.test.ts`, and `apps/store/tests/unit/lib/stripe-product-copy.test.ts`. Adding new routes, metadata builders, or Stripe sync utilities must use the helpers so tests continue to pass.
- Live Stripe verification is covered by `apps/store/tests/integration/stripe-product-copy-live.test.ts` (requires `STRIPE_SECRET_KEY_LIVE` or `STRIPE_SECRET_KEY`). Run it manually before a merge if you want to double-check production data:  
  ```
  pnpm vitest --run apps/store/tests/integration/stripe-product-copy-live.test.ts
  ```
- UI placements are centralized in `apps/store/components/product/landers/default/HomeTemplate.tsx` so all lander variants pick up the shared component.

## How to Verify

1. When introducing a new product or changing SEO copy, run `pnpm test:unit` and ensure the `unofficial-branding` suite still passes.
2. Spot-check the rendered HTML (`view-source`) to confirm the `<title>`, `<meta name="description">`, and OpenGraph/Twitter descriptions include the compliance string only when expected.
3. In the UI, confirm the disclaimer text appears both under the hero and at the bottom of the Pricing CTA (full-width row) using the same tone/weight.
