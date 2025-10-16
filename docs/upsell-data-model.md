# Upsell Data Model

Each reusable upsell now lives in `apps/store/data/order-bumps/*.yaml`. The filename (without extension) is the upsell slug. A definition provides the canonical copy, talking points, and Stripe metadata for the add-on:

```yaml
# apps/store/data/order-bumps/serp-downloaders-bundle.yaml
product_slug: serp-downloaders-bundle
title: Unlock every downloader we offer—now and in the future.
price: $47.00
features:
  - Access to every downloader in the SERP Apps catalog
stripe:
  price_id: price_live_123
  test_price_id: price_test_123
```

Product YAML files no longer need to duplicate the upsell payload. To attach the definition above, add one line to the product:

```yaml
order_bump: serp-downloaders-bundle
```

If a lander needs bespoke tweaks (e.g., a different badge or default selection), supply an object with overrides. Any fields you provide locally win over the shared definition:

```yaml
order_bump:
  slug: serp-downloaders-bundle
  description: "Lifetime access to every downloader we offer."
  default_selected: true
```

## Why split the data

**Pros**
- Canonical marketing copy and Stripe IDs live in one place.
- Multiple landers can reuse the same upsell without drift.
- Product YAML stays concise (`order_bump: <slug>` in the default case).

**Inline-only upsells**

We still support defining the full upsell inline when it’s unique to the product (for example, a service add-on that doesn’t warrant a standalone product). In that case, include the same fields you’d place in the dedicated YAML (`title`, `price`, `stripe.price_id`, etc.).

## Validation & resolution

1. `scripts/validate-products.ts` now ensures any referenced upsell slug exists under `data/order-bumps/` (unless you provide inline fields).
2. `resolveOrderBump` merges the shared definition and any inline overrides, then pulls the live Stripe amount from `data/prices/manifest.json` so display + checkout totals stay in sync.
3. Checkout handlers and templates receive a single normalized object regardless of whether the data came from a shared file or an inline definition.

## Enable, disable, and verify an upsell

- **Enable**: reference the slug (`order_bump: serp-downloaders-bundle`) or provide overrides with `enabled: true`.
- **Temporarily disable**: either remove the field or set `order_bump: { slug: serp-downloaders-bundle, enabled: false }`. The schema normaliser keeps the slug for documentation while preventing it from rendering.
- **Custom messaging**: any field supplied inline—`description`, `features`, `default_selected`, etc.—wins over the shared definition. Avoid duplicating price strings unless the offer differs for a single lander.
- **Verification loop**:
  1. Run `pnpm --filter @apps/store validate:products` to rebuild the order-bump manifest and ensure Stripe IDs exist for both live/test.
  2. Run `pnpm --filter @apps/store test:unit -- tests/api/checkout-session.test.ts` and `tests/api/paypal-create-order.test.ts` when changing pricing metadata to confirm order-bump totals remain accurate.
  3. For visual checks, hit a no-upsell lander (`youtube-downloader`) plus an upsell-enabled lander and confirm the Pricing CTA behaves as expected.

### Upsell-only offers

An upsell does **not** need a public product page. Leave `product_slug` empty (or omit it) when the offer should only appear as an order bump. If you do supply `product_slug`, validation will confirm the referenced product exists so cross-sells stay in sync.
