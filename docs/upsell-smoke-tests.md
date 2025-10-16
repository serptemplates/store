# Upsell Checkout Smoke Tests

Run these before major releases or when changing pricing/checkout code. Cover both payment providers and both upsell states.

## 1. Stripe Checkout (Test mode)
1. `pnpm --filter @apps/store dev`
2. Visit `/checkout?product=tiktok-downloader`.
3. **Upsell OFF**: leave the upsell unchecked, pay with `4242 4242 4242 4242`, any future expiry, `123`.
   - Confirm amount = base price ($17).
   - In Stripe Dashboard (test), confirm the checkout session metadata shows `orderBumpSelected = false`.
4. **Upsell ON**: refresh, check the upsell, pay with `5555 5555 5555 4444`.
   - Confirm amount = $64 ($17 + $47 upsell).
   - Verify Stripe metadata includes `orderBumpSelected = true`, `orderBumpUnitCents = 4700`, etc.

## 2. PayPal Checkout (Sandbox)
1. Toggle “Pay with PayPal” in the embedded checkout.
2. Use a PayPal sandbox buyer (e.g., `buyer@serp.test`).
3. **Upsell OFF**: leave unchecked, complete PayPal flow.
   - Check PayPal sandbox transaction amount = base price.
   - Verify metadata in the stored checkout session (`checkout_sessions` table) has `orderBumpSelected = false`.
4. **Upsell ON**: redo with the upsell selected.
   - Amount should reflect base + $47.
   - Metadata in our DB should show `orderBumpSelected = true` and updated totals.

## 3. QA Notes
- Record results in release QA (pass/fail, screenshots).
- If either provider fails, block release until fixed.
