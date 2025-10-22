# Upsell Checkout Smoke Tests

Run these before major releases or when changing pricing/checkout code. Primary CTAs now open Payment Links in a new tab; PayPal is only available through the explicit PayPal flow.

## 1. Stripe Payment Link (Test mode)
1. `pnpm --filter @apps/store dev`
2. Visit `/tiktok-downloader` (or any product with a live `payment_link` configured).
3. Click the hero CTA.
   - Confirm a new tab opens pointing at the Stripe Payment Link (no popup warnings).
   - Complete test payment (`4242 4242 4242 4242`, any future expiry, `123`).
   - In the Stripe Dashboard (test), confirm the payment link metadata includes the expected `offerId`, `landerId`, and `ghl_tag` values; no `orderBump*` keys should be present.

## 2. PayPal Checkout
- Trigger the PayPal CTA (where available) or call `/api/paypal/create-order` with the product slug.
- Confirm the approval URL is returned, and the order persists in the database with `source = paypal`.

## 3. QA Notes
- Record results in release QA (pass/fail, screenshots).
- If either provider fails, block release until fixed.
