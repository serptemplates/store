# Checkout Cross-Sell Setup

Stripe’s hosted Checkout now owns all post-purchase offers. We no longer maintain order-bump YAML or embedded UI logic in the storefront.

## What changed

- Cross-sell / “order bump” offers are configured directly in the Stripe Dashboard.
- Product YAML under `apps/store/data/products/*.yaml` should omit the `order_bump` block; any legacy entries can be removed without impacting the hosted flow.
- Checkout metadata emitted by the storefront excludes `orderBump*` keys. Downstream systems should rely on Stripe’s `after_completion` settings or Dashboard reporting for upsell performance.

## Stripe configuration

1. In Stripe Dashboard → **Checkout** → **Cross-sells**, add the offer you want the customer to see after payment.
2. Choose the eligible products/prices (usually the same price IDs referenced in product YAML).
3. Save and publish the cross-sell. Stripe handles presentation, pricing, and fulfillment.

## Storefront verification

- Visit `/checkout?product=<slug>` and confirm the “Continue to Stripe Checkout” button launches the hosted page without a popup warning.
- Ensure product YAML has `cta_mode: checkout` (or omits `buy_button_destination`) so the storefront directs to `/checkout`.
- Confirm Stripe session metadata includes `checkoutSource = hosted_checkout_stripe` and does **not** include deprecated order-bump fields.

## PayPal parity

PayPal checkout is no longer exposed in the hosted flow. All storefront CTAs route through Stripe Checkout; handle PayPal-only purchases via separate tooling if required.

## Clean-up checklist

- [ ] Remove `order_bump` entries from any product YAML that still contain them.
- [ ] Delete unused `data/order-bumps/*` definitions after confirming no references remain.
- [ ] Update internal playbooks or automations that assumed order-bump metadata existed in checkout payloads.
