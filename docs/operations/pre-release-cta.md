# Pre-Release CTA Runbook

This branch introduces a schema-level toggle so pre-release products can share a single landing page layout while their primary call-to-action (CTA) points visitors to the waitlist funnel.

## Behaviour Overview

- Any product whose CTA mode resolves to `pre_release` now opens an inline GoHighLevel waitlist form (ID `p0UQfTbXR69iXnRlE953`) in a modal rather than navigating away.
- The default label for these CTAs is **Get Notified**. If a product supplies a custom `pricing.cta_text`, it is honoured unless it is the legacy “Get it Now” copy.
- Analytics still records `product_checkout_clicked` with `destination: "waitlist"` whenever someone triggers the modal from any CTA placement.

## Editing Product YAML

1. **Mark the product pre-release**
   - Set the product `status: pre_release` so the storefront routes visitors to the waitlist modal instead of a payment link.
2. **Optional overrides**
   - `waitlist_url`: provide a custom fallback URL (used if the modal cannot render). Most products can omit this.
   - `pricing.cta_text`: provide custom button copy (use sparingly; “Get Notified” is the standard).
3. **Returning to checkout**
   - Change the product `status` back to `live` when you are ready to sell. The checkout CTA is derived from the slug (`/checkout/<slug>`), so no additional JSON fields are required.

## Hosted Checkout Usage

Any product with `status: pre_release` automatically routes visitors to the waitlist CTA. Production launches rely on the slug-derived `/checkout/<slug>` path, so there is no separate CTA URL to maintain.

## QA Checklist

- Confirm all CTA variants on the product page display **Get Notified**, open the GoHighLevel modal, and successfully load the embedded form.
- Inspect DevTools → Network while triggering the modal and verify `product_checkout_clicked` reports `destination: "waitlist"`.
- Switch the product back to `live` and confirm the landing page routes to `/checkout/<slug>` with in-tab navigation.
