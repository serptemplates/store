# Pre-Release CTA Runbook

This branch introduces a schema-level toggle so pre-release products can share a single landing page layout while their primary call-to-action (CTA) points visitors to the waitlist funnel.

## Behaviour Overview

- Any product whose CTA mode resolves to `pre_release` sends every primary CTA (hero, pricing section, sticky bar, and navbar) to `https://newsletter.serp.co/waitlist` in a new tab.
- The default label for these CTAs is **Get Notified**. If a product supplies a custom `pricing.cta_text`, it is honoured unless it is the legacy “Get it Now” copy.
- Analytics now records `product_checkout_clicked` with `destination: "waitlist"` whenever someone clicks a pre-release CTA.

## Editing Product YAML

1. **Mark the product pre-release**
   - Set `status: pre_release`, or set `cta_mode: pre_release` if you need to preserve a different status badge.
2. **Optional overrides**
   - `waitlist_url`: point to a different opt-in page (defaults to the SERP newsletter waitlist).
   - `pricing.cta_text`: provide custom button copy (use sparingly; “Get Notified” is the standard).
3. **Returning to checkout**
   - Remove the explicit `cta_mode` and change `status` to `live`, or set `cta_mode: checkout` for early access launches.

## Embedded Checkout Usage

Most live products link directly to GoHighLevel payment pages. As of this change, only the following products use the embedded Stripe checkout at `/checkout`:

- `ai-voice-cloner-app`
- `stocksy-downloader`

Keep this in mind when validating checkout regression fixes—the embedded flow still exists but is limited to those SKUs.

## QA Checklist

- Confirm all CTA variants on the product page display **Get Notified**, open in a new tab, and reach the correct waitlist URL.
- Inspect DevTools → Network while clicking the CTA and verify `product_checkout_clicked` reports `destination: "waitlist"`.
- Switch the product back to `live` (or `cta_mode: checkout`) and confirm the landing page reverts to the checkout CTA with in-tab navigation.

