# Upsell Regression Checklist

Run these checks whenever we touch pricing CTA logic, schema files, or checkout code to ensure products *without* an upsell still behave exactly as before.

## 1. Landers Without Upsells
- Pick a product that has no `order_bump` in YAML (e.g. `youtube-downloader.yaml`).
- `pnpm --filter @apps/store dev` → visit `/youtube-downloader`.
- Confirm the Pricing CTA renders without any upsell panel, the hero CTA and button copy are unchanged, and the “Total” card shows only the base price.
- Run `pnpm --filter @apps/store test:unit -- --run` to ensure `productToHomeTemplate` tests still pass (these guard the `pricing` subset for non-upsell cases).

## 2. Checkout Smoke Tests (Stripe & PayPal)
- Stripe: hit `/checkout?product=youtube-downloader` and verify the embedded checkout loads instantly (no spinner). Complete a test card (`4242…`) and confirm metadata shows `orderBumpSelected = false`.
- PayPal: toggle to PayPal in the embedded checkout, click through to the sandbox flow, make sure the amount equals the base price and metadata still carries `orderBumpSelected = "false"` and `orderBumpUnitCents = "0"`.

## 3. Validation & Schema
- `pnpm --filter @apps/store validate:products` → should succeed, ensuring new schema rules don’t break products without upsells.
- `pnpm --filter @apps/store test:unit -- tests/lib/buy-button-links.test.ts` → confirms all backed URLs and buy buttons remain valid.

## 4. Analytics / Events
- In PostHog/Segment (test mode), confirm events from the non-upsell product still fire with `orderBumpSelected = "false"` and no missing properties.
- Toggle an upsell-enabled product and verify the `checkout_order_bump_toggled` event records both `selected` states, `orderBumpId`, and the updated `value` payload.

## 5. Visual QA
- Capture screenshots of the Pricing CTA for a no-upsell product at `sm`, `md`, and `lg` breakpoints to ensure the layout didn’t shift.
- Check the embedded checkout toggle button states (Stripe vs PayPal) to confirm they aren’t impacted by the new spinner/disable logic.

Document pass/fail notes in release QA so we can spot regressions quickly and know which products were exercised.
