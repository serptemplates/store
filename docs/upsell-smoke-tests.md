# Upsell Checkout Smoke Tests

Run these before major releases or when changing pricing/checkout code. Primary CTAs now navigate to `/checkout/<slug>`, where the server creates the Stripe Checkout Session.

## 1. Stripe Checkout (test mode)
1. `pnpm --filter @apps/store dev`
2. Visit `/tiktok-downloader` (or any live product with `pricing.cta_href`).
3. Click the hero CTA.
   - Confirm the click navigates to `/checkout/<slug>` (Network tab shows `GET /checkout/... 302` → `https://checkout.stripe.com/...`).
   - Complete test payment (`4242 4242 4242 4242`, any future expiry, `123`).
   - In the Stripe Dashboard (test), confirm the Checkout Session metadata includes the expected `offerId`, `landerId`, and `ghl_tag` values.

## 2. QA Notes
- Record results in release QA (pass/fail, screenshots).
- If either provider fails, block release until fixed.
