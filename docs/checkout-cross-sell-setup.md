# Checkout Cross-Sell Setup

Stripe Payment Links now own all post-purchase offers. We no longer maintain order-bump YAML or embedded UI logic in the storefront.

## What changed

- Cross-sell / “order bump” offers are configured directly in the Stripe Dashboard.
- Product YAML under `apps/store/data/products/*.yaml` should omit the `order_bump` block; any legacy entries can be removed without impacting the hosted flow.
- Checkout metadata emitted by the storefront excludes `orderBump*` keys. Downstream systems should rely on Stripe’s `after_completion` settings or Dashboard reporting for upsell performance.

## Stripe configuration

1. In Stripe Dashboard → **Checkout** → **Cross-sells**, add the offer you want the customer to see after payment.
2. Choose the eligible products/prices (usually the same price IDs referenced in product YAML).
3. Save and publish the cross-sell. Stripe handles presentation, pricing, and fulfillment.

## Storefront verification

- Visit the product page and click the primary CTA; confirm it opens the configured payment link (Stripe or GHL) without triggering popup blockers.
- Ensure product YAML defines a `payment_link` so the storefront knows which checkout experience to launch.
- Confirm Stripe session metadata still includes the expected fields for downstream fulfillment.

## PayPal parity

PayPal checkout is no longer exposed in the hosted flow. All storefront CTAs route through Stripe Checkout; handle PayPal-only purchases via separate tooling if required.

## Clean-up checklist

- [ ] Remove `order_bump` entries from any product YAML that still contain them.
- [ ] Delete unused `data/order-bumps/*` definitions after confirming no references remain.
- [ ] Update internal playbooks or automations that assumed order-bump metadata existed in checkout payloads.
