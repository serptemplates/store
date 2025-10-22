# Pre-Release CTA Runbook

This branch introduces a schema-level toggle so pre-release products can share a single landing page layout while their primary call-to-action (CTA) points visitors to the waitlist funnel.

## Behaviour Overview

- Any product whose CTA mode resolves to `pre_release` now opens an inline GoHighLevel waitlist form (ID `p0UQfTbXR69iXnRlE953`) in a modal rather than navigating away.
- The default label for these CTAs is **Get Notified**. If a product supplies a custom `pricing.cta_text`, it is honoured unless it is the legacy “Get it Now” copy.
- Analytics still records `product_checkout_clicked` with `destination: "waitlist"` whenever someone triggers the modal from any CTA placement.

## Editing Product YAML

1. **Mark the product pre-release**
   - Set `status: pre_release`, or set `cta_mode: pre_release` if you need to preserve a different status badge.
2. **Optional overrides**
   - `waitlist_url`: provide a custom fallback URL (used if the modal cannot render). Most products can omit this.
   - `pricing.cta_text`: provide custom button copy (use sparingly; “Get Notified” is the standard).
3. **Returning to checkout**
   - Remove the explicit `cta_mode` and change `status` to `live`, or set `cta_mode: checkout` for early access launches.

## Hosted Checkout Usage

Any product whose CTA resolves to `checkout` now routes visitors to `/checkout?product=<slug>`, where they can click “Continue to Stripe Checkout.” Ensure the product YAML either sets `cta_mode: checkout` explicitly or leaves `buy_button_destination` empty so the adapter selects the hosted path.

## QA Checklist

- Confirm all CTA variants on the product page display **Get Notified**, open the GoHighLevel modal, and successfully load the embedded form.
- Inspect DevTools → Network while triggering the modal and verify `product_checkout_clicked` reports `destination: "waitlist"`.
- Switch the product back to `live` (or `cta_mode: checkout`) and confirm the landing page reverts to the checkout CTA with in-tab navigation.
