# Upsell / Order Bump Payment Setup Checklist

This walkthrough keeps Stripe and PayPal aligned any time we introduce or update an upsell (a.k.a. order bump, cross‑sell, upgrade).

## Stripe

1. **Decide which Stripe Product to use**
   - Reuse the main product’s Stripe product, or
   - Create a dedicated “Upsells” product if you want shared reporting.

2. **Create a Price in both environments**
   - Live: one‑time price (USD) that matches the upsell amount.
   - Test: mirror the live price so we can exercise the flow locally and on staging.

3. **Capture IDs for YAML**
   - `stripe.price_id` ⟶ live price.
   - `stripe.test_price_id` ⟶ test price.
   - Add or update these under the product’s `order_bump` block.

4. **Optional metadata**
   - If you track reporting via Stripe metadata, add it when creating the price (e.g. `upsell: true`, `primary_product: slug`).

5. **Run a local checkout**
   - `pnpm --filter @apps/store dev`.
   - Visit `/checkout?product=<slug>`.
   - Toggle the upsell and confirm Stripe’s hosted modal shows the correct totals for both selected and deselected flows.

## PayPal

PayPal totals are derived from the formatted `order_bump.price` string.

1. Ensure the YAML value is a valid currency string (e.g. `$29` or `$29.00`).
2. PayPal returns do not need a pre‑created “item” entry, but you can register the upsell as a catalog item if you want richer sales reporting.
3. Run the embedded checkout in PayPal mode (`Pay with PayPal`) and confirm the order total jumps by the upsell amount when selected.

## Automation scripts (future)

We can automate price creation via Stripe’s API to reduce manual steps. Until then, record each new price ID in this table:

| Upsell slug | Live price ID        | Test price ID        | Last validated |
| ----------- | -------------------- | -------------------- | -------------- |
| priority-support | `price_live_xxx` | `price_test_xxx` | 2025‑02‑15 |

## Sanity checklist per release

- [ ] Live + test Stripe price IDs exist and are in YAML.
- [ ] `pnpm --filter @apps/store validate:products` passes.
- [ ] Manual Stripe checkout (upsell off + on).
- [ ] Manual PayPal checkout (upsell off + on).
- [ ] Stripe Dashboard metadata shows `orderBumpSelected` as expected.
- [ ] PayPal order totals match the Stripe totals for the same scenario.

Store this checklist with your release notes so QA can sign off quickly. Once we automate price creation we’ll fold those scripts back into this doc.
