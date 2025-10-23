# Upsell Regression Checklist

Run these checks whenever we touch pricing CTA logic, schema files, or checkout code to ensure products *without* an upsell still behave exactly as before.

## 1. Landers Without Upsells
- Pick a product that has no `order_bump` in YAML (e.g. `youtube-downloader.yaml`).
- `pnpm --filter @apps/store dev` → visit `/youtube-downloader`.
- Confirm the Pricing CTA renders without any upsell panel, the hero CTA and button copy are unchanged, and the “Total” card shows only the base price.
- Run `pnpm --filter @apps/store test:unit -- --run` to ensure `productToHomeTemplate` tests still pass (these guard the `pricing` subset for non-upsell cases).

## 2. Checkout Smoke Tests
- Stripe Payment Link: open the product page, click the primary CTA, and confirm a new tab opens to the configured Stripe Payment Link. Complete a test card (`4242…`), then verify in the dashboard/webhook logs that metadata still includes the correct `offerId`, `landerId`, and `ghl_tag`.

## 3. Validation & Schema
- `pnpm --filter @apps/store validate:products` → should succeed, ensuring new schema rules don’t break products without upsells.
- `pnpm --filter @apps/store test:unit -- tests/lib/buy-button-links.test.ts` → confirms all backed URLs and buy buttons remain valid.

## 4. Analytics / Events
- In PostHog/Segment (test mode), confirm `checkout_viewed`, `checkout_payment_method_selected`, and `checkout_session_ready` fire with the expected `productSlug`, `affiliateId`, and coupon metadata when present.
- Ensure no analytics payloads include the deprecated order-bump properties (`orderBumpSelected`, `orderBumpId`, etc.).

## 5. Visual QA
- Capture screenshots of the Pricing CTA for a no-upsell product at `sm`, `md`, and `lg` breakpoints to ensure the layout didn’t shift.
- Confirm `/checkout` immediately redirects back to the product slug (for legacy links) and the cancel/success routes still render correctly styled fallback pages.

Document pass/fail notes in release QA so we can spot regressions quickly and know which products were exercised.
