# Upsell Checkout Smoke Tests

Run these before major releases or when changing pricing/checkout code. Stripe hosts the entire purchase experience; PayPal is no longer presented to shoppers in this flow.

## 1. Stripe Checkout (Test mode)
1. `pnpm --filter @apps/store dev`
2. Visit `/checkout?product=tiktok-downloader`.
3. Submit the form with test card `4242 4242 4242 4242`, any future expiry, `123`.
   - Confirm the hosted checkout launches after clicking the button (no popup warning) and displays the correct product name/amount ($17).
   - In the Stripe Dashboard (test), confirm the checkout session metadata includes `checkoutSource = hosted_checkout_stripe` and **does not** include any `orderBump*` keys.

## 2. PayPal (Deprecated)
- Confirm no PayPal button or toggle is visible in the hosted Stripe flow. All shoppers should be routed through Stripe Checkout only.

## 3. QA Notes
- Record results in release QA (pass/fail, screenshots).
- If either provider fails, block release until fixed.
