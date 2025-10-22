# Upsell Data Model (Deprecated)

Stripe Checkout now owns all cross-sell and add-on experiences. The storefront no longer stores or reads `order_bump` definitions, and checkout payloads no longer contain order-bump metadata.

- Managed upsells/cross-sells should be configured directly inside the Stripe Dashboard.
- Product YAML files may still contain legacy `order_bump` blocks, but they are ignored and can be removed at your convenience.
- Checkout metadata emitted by the app only includes the base product context plus coupon/affiliate information.

See `docs/checkout-cross-sell-setup.md` for the current process and cleanup checklist.
