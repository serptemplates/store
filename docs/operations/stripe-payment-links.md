# Stripe Payment Links

Last generated: 2025-10-22T22:07:34Z

## Cross-sell Configuration

- Every active downloader product in Stripe now surfaces the SERP Downloaders Bundle as a cross-sell. If a new product is added, open the product in the Stripe dashboard, expand **Cross-sells**, search for “SERP Downloaders Bundle”, and add it. Stripe saves the selection automatically—no extra confirmation dialog appears.
- Cross-sells can only be managed through the dashboard today. If Stripe ships API support, update `apps/store/scripts/update-stripe-cross-sells.ts` accordingly and refresh this section.

## Success Redirect & Metadata

- Automation scripts (`stripe:create-payment-links`, `stripe:sync-payment-links`) now set `after_completion` to redirect shoppers back to `/checkout/success` with the following query params: `provider=stripe`, `slug=<product-slug>`, `payment_link_id=<plink_id>`, `mode=<live|test>`, and `session_id={CHECKOUT_SESSION_ID}`. Override the base URL by exporting `STRIPE_PAYMENT_LINK_SUCCESS_REDIRECT_URL` when running against staging or local environments.
- If a link is created or edited directly in the Stripe dashboard, update the redirect URL to match `https://apps.serp.co/checkout/success?provider=stripe&slug=<product-slug>&payment_link_id=<plink_id>&mode=live&session_id={CHECKOUT_SESSION_ID}` so analytics continue to fire on our confirmation page.
- Each sync also re-applies Payment Link metadata (`product_slug`, `ghl_tag`, `stripe_product_id`, `payment_link_mode`) and mirrors it to `payment_intent_data.metadata`. Re-run the sync script after manual changes so fulfilment (webhooks) and reporting remain consistent.
- Terms of Service consent is now mandatory. The creation script sets `consent_collection.terms_of_service = required`, and webhook handlers persist the acceptance flag (`metadata.tosAccepted`) so GHL and analytics can rely on it. Stripe currently rejects API updates of this setting on older links, so the sync script will warn when the toggle needs to be enabled manually in the dashboard—set **Terms of service → Required** on any flagged Payment Link.

## Operational Assumptions

- No feature flags or beta APIs are required; live/test routing is driven entirely from link metadata and `STRIPE_PAYMENT_LINK_SUCCESS_REDIRECT_URL`.
- Stripe-native coupons remain enabled on every Payment Link, so the storefront no longer manages bespoke coupon codes.
- `/checkout/success` is the single confirmation surface. Stripe links must always redirect there so PostHog/GA/Facebook events fire and webhook metadata reconciles.
- Fulfilment derives the product slug, GHL tag, and payment-link mode from Stripe metadata. Do not remove `product_slug`/`ghl_tag` from products or prices without updating the webhook mapping.
- Legacy PayPal checkout has been removed; support and finance teams should treat Stripe Payment Links as the sole purchase surface (historical PayPal orders surface as `legacy_paypal` sources).

## Developer Runbook

1. Ensure `.env` exposes the correct Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_SECRET_KEY_TEST`, `STRIPE_WEBHOOK_SECRET_*`) and set `STRIPE_PAYMENT_LINK_SUCCESS_REDIRECT_URL` if you need a non-production host.
2. Populate product YAML with the target `stripe.price_id` (run `pnpm --filter @apps/store validate:products` if unsure).
3. Generate or refresh links with `pnpm --filter @apps/store stripe:create-payment-links`; re-run after any metadata changes so `docs/operations/stripe-payment-links.md` stays current.
4. Sync existing links to the latest settings (redirect, metadata, phone collection, etc.) with `pnpm --filter @apps/store stripe:sync-payment-links`.
5. Commit the updated product YAML and docs, then run `pnpm lint && pnpm typecheck && pnpm test:unit` before promoting changes.
6. If Stripe cross-sells need to be adjusted, follow the dashboard-only workflow above and record the edit in this document for operations.
7. For test environments, generate or refresh test-mode links with `pnpm --filter @apps/store stripe:create-payment-links --mode=test`; the results are logged to `docs/operations/stripe-payment-links-test.md` for reference.

## Fulfilment Validation Plan

- Run `pnpm --filter @apps/store test:unit`; key suites (`tests/api/stripe-webhook.test.ts`, `tests/app/checkout/success/actions.ghl.test.ts`, `tests/lib/ghl-client-contacts.test.ts`) assert that `payment_link_id`, `product_slug`, and `ghl_tag` flow through to fulfilment handlers.
- Inspect webhook logs in the Stripe dashboard after deploying updates and confirm events show the new metadata set (`payment_link_id`, `payment_link_mode`, `product_slug`, `ghl_tag`).
- Trigger a manual payment using a test Payment Link (`pnpm --filter @apps/store test:purchase`) and verify `/checkout/success` surfaces the reference plus analytics events (PostHog/GA) fire once.
- Ensure GoHighLevel tagging still occurs by reviewing the latest webhook sync outcome in `apps/store/lib/payments/stripe-webhook/events/checkout-session-completed.ts` logs.

## Analytics Validation

- Latest confirmation: 2025-10-22 (local test mode).
  - Started Stripe listener with `stripe listen --forward-to http://localhost:3000/api/stripe/webhook --api-key $STRIPE_SECRET_KEY_TEST` and injected the returned `whsec` into `STRIPE_WEBHOOK_SECRET_TEST`.
  - Ran `pnpm --filter @apps/store test:e2e`; Playwright exercised a product CTA, completed a Stripe Payment Link checkout, and arrived at `/checkout/success`.
  - Observed a single `checkout:completed` PostHog event plus appended metadata (`provider=stripe`, `payment_link_id`, `slug`) in the browser console; no duplicate firing on refresh.
  - Stripe webhook handler appended GHL metadata to existing fields—verified via test contact history in GoHighLevel.
  - Test promotion code `TEST20` applied successfully, and the SERP Downloaders Bundle appeared in the cross-sell panel with TOS checkbox enforced.
- Re-run this validation whenever scripts adjust redirect URLs, metadata structures, or when Stripe changes Payment Link consent/cross-sell behaviour.

## Stakeholder Summary

- Stripe Payment Links now replace hosted checkout entirely; all CTA traffic uses the helper introduced in `useProductCheckoutCta`.
- Success-page analytics depend on the redirect parameters documented above; confirm any third-party edits keep that contract intact.
- There is no parallel PayPal flow. When reconciling historical data, filter on `source = 'legacy_paypal'` to identify legacy orders.

| Product | Price ID | Link ID | URL | Status | GHL Tag | Stripe Product | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `123movies-downloader` | `price_1S99wh06JrOmKRCmkF8J8XUh` | `28EbITfD22m23uPbp10VO01` | https://buy.stripe.com/28EbITfD22m23uPbp10VO01 | skipped | `purchase-123movies-downloader` | `prod_Sv6Czh24RpPTaL` | Payment link already present. |
| `123rf-downloader` | `price_1S99wh06JrOmKRCmViWhNpBg` | `8x29ALaiId0Ge9t9gT0VO02` | https://buy.stripe.com/8x29ALaiId0Ge9t9gT0VO02 | skipped | `purchase-123rf-downloader` | `prod_Sv6GU0QSzFNUOd` | Payment link already present. |
| `adobe-stock-downloader` | `price_1S99wh06JrOmKRCm9efFxcwZ` | `4gM8wH76w6Ci7L5fFh0VO03` | https://buy.stripe.com/4gM8wH76w6Ci7L5fFh0VO03 | skipped | `purchase-adobe-stock-downloader` | `prod_Sv6GxpT96KLpzS` | Payment link already present. |
| `ai-voice-cloner-app` | `price_1S99fd06JrOmKRCmxtuDhI3T` | `14AaEPcqQf8O0iD78L0VO04` | https://buy.stripe.com/14AaEPcqQf8O0iD78L0VO04 | skipped | `purchase-ai-voice-cloner-app` | `prod_SqhYIO8EBULvaD` | Payment link already present. |
| `alamy-downloader` | `price_1S99wi06JrOmKRCmJJfdiHTB` | `9B6cMXfD20dU6H18cP0VO05` | https://buy.stripe.com/9B6cMXfD20dU6H18cP0VO05 | skipped | `purchase-alamy-downloader` | `prod_Sv6GxfQm1ccyWC` | Payment link already present. |
| `alpha-porno-video-downloader` | `price_1SELi806JrOmKRCmYjc9McRN` | `7sYbITduU0dU7L52Sv0VO06` | https://buy.stripe.com/7sYbITduU0dU7L52Sv0VO06 | skipped | `purchase-alpha-porno-downloader` | `prod_SrAlphaPorno123` | Payment link already present. |
| `amazon-video-downloader` | `price_1S9dJr06JrOmKRCm9zukkAO8` | `plink_1SLABu06JrOmKRCmN5vp8dEk` | https://buy.stripe.com/4gM5kv1Mc5yefdxfFh0VO1w | created | `purchase-amazon-video-downloader` | `prod_Sv6GpeME33OEqF` |  |
| `beeg-video-downloader` | `price_1RvXEr06JrOmKRCmJZDJjALY` | `5kQdR176w0dU5CX3Wz0VO1u` | https://buy.stripe.com/5kQdR176w0dU5CX3Wz0VO1u | skipped | `purchase-beeg-video-downloader` | `prod_SrFXkM8CAB2Ds8` | Payment link already present. |
| `bilibili-downloader` | `price_1S99wj06JrOmKRCmXQNer2ho` | `00w3cnaiId0GghB64H0VO07` | https://buy.stripe.com/00w3cnaiId0GghB64H0VO07 | skipped | `purchase-bilibili-downloader` | `prod_Sv6Go0jcavriZb` | Payment link already present. |
| `bongacams-downloader` | `price_1S99wj06JrOmKRCmIzTdkBGx` | `eVq14f9eEgcSc1l64H0VO08` | https://buy.stripe.com/eVq14f9eEgcSc1l64H0VO08 | skipped | `purchase-bongacams-downloader` | `prod_Sv6GMlDOkyZs7k` | Payment link already present. |
| `camsoda-downloader` | `price_1S99wk06JrOmKRCm2XTuWuu0` | `aFa4graiI1hYaXheBd0VO09` | https://buy.stripe.com/aFa4graiI1hYaXheBd0VO09 | skipped | `purchase-camsoda-downloader` | `prod_Sv6GHj9F6PuSPW` | Payment link already present. |
| `canva-downloader` | `price_1S99wk06JrOmKRCmiqfoFkqm` | `8x27sDduUd0G7L50Kn0VO0a` | https://buy.stripe.com/8x27sDduUd0G7L50Kn0VO0a | skipped | `purchase-canva-downloader` | `prod_Sv6GiFXmH9cXgG` | Payment link already present. |
| `chaturbate-downloader` | `price_1S99wl06JrOmKRCmpsVjKERK` | `5kQ7sD62sgcSfdxbp10VO0b` | https://buy.stripe.com/5kQ7sD62sgcSfdxbp10VO0b | skipped | `purchase-chaturbate-downloader` | `prod_Sv6GzNN1Yu0VFV` | Payment link already present. |
| `circle-downloader` | `price_1S99wl06JrOmKRCmy32X7AjP` | `28EaEPcqQ5ye3uP3Wz0VO0c` | https://buy.stripe.com/28EaEPcqQ5ye3uP3Wz0VO0c | skipped | `purchase-circle-downloader` | `prod_Sv6G979StrlTXK` | Payment link already present. |
| `clientclub-downloader` | `price_1S99wm06JrOmKRCmaau6Xiqv` | `bJe8wHduU1hY4yT8cP0VO0d` | https://buy.stripe.com/bJe8wHduU1hY4yT8cP0VO0d | skipped | `purchase-clientclub-downloader` | `prod_Sv6Gg3oBtdLifN` | Payment link already present. |
| `coursera-downloader` | `price_1S99wn06JrOmKRCmwkYTxZBx` | `6oU5kv1Mc7GmghB1Or0VO0e` | https://buy.stripe.com/6oU5kv1Mc7GmghB1Or0VO0e | skipped | `purchase-coursera-downloader` | `prod_Sv6Gv9ZcVq94rx` | Payment link already present. |
| `dailymotion-downloader` | `price_1S99wo06JrOmKRCmtEGHbI2T` | `5kQaEP1Mcd0G3uPdx90VO0f` | https://buy.stripe.com/5kQaEP1Mcd0G3uPdx90VO0f | skipped | `purchase-dailymotion-downloader` | `prod_Sv6Gc2uzEQtuWs` | Payment link already present. |
| `depositphotos-downloader` | `price_1S99wo06JrOmKRCmO7Fe7LYG` | `dRmeV50I8aSy9Td9gT0VO0g` | https://buy.stripe.com/dRmeV50I8aSy9Td9gT0VO0g | skipped | `purchase-depositphotos-downloader` | `prod_Sv6GOCtV2VRldV` | Payment link already present. |
| `deviantart-downloader` | `price_1S99wp06JrOmKRCmxPZvi7YP` | `fZubITaiI7Gm0iD2Sv0VO0h` | https://buy.stripe.com/fZubITaiI7Gm0iD2Sv0VO0h | skipped | `purchase-deviantart-downloader` | `prod_Sv6GiUbl5MtRp2` | Payment link already present. |
| `dreamstime-downloader` | `price_1S99wq06JrOmKRCmT1rrKjcd` | `cNi9AL8aAaSyaXhfFh0VO0i` | https://buy.stripe.com/cNi9AL8aAaSyaXhfFh0VO0i | skipped | `purchase-dreamstime-downloader` | `prod_Sv6GEMnA4OrbWe` | Payment link already present. |
| `eporner-video-downloader` | `price_1RvXID06JrOmKRCmdSqQK07c` | `6oU7sD1Mc5ye8P950D0VO0j` | https://buy.stripe.com/6oU7sD1Mc5ye8P950D0VO0j | skipped | `purchase-eporner-downloader` | `prod_SrFXvsPxRa2Ugv` | Payment link already present. |
| `erome-downloader` | `price_1S99wr06JrOmKRCmnjJiTjYy` | `cNi7sD0I84ua1mH3Wz0VO0k` | https://buy.stripe.com/cNi7sD0I84ua1mH3Wz0VO0k | skipped | `purchase-erome-downloader` | `prod_Sv6Gl659Drkqem` | Payment link already present. |
| `erothots-downloader` | `price_1S99wr06JrOmKRCmb9rOFCbT` | `14A3cn1Mc7Gm3uPgJl0VO0l` | https://buy.stripe.com/14A3cn1Mc7Gm3uPgJl0VO0l | skipped | `purchase-erothots-downloader` | `prod_Sv6GQD10gRgLZL` | Payment link already present. |
| `facebook-video-downloader` | `price_1S99wr06JrOmKRCmnHmBidFY` | `4gM00b1Mcd0Gc1lbp10VO0m` | https://buy.stripe.com/4gM00b1Mcd0Gc1lbp10VO0m | skipped | `purchase-facebook-video-downloader` | `prod_Sv6Gxbj0G8PsfX` | Payment link already present. |
| `flickr-downloader` | `price_1S99ws06JrOmKRCmFvK8ceNO` | `fZu6ozgH64ua6H1ct50VO0n` | https://buy.stripe.com/fZu6ozgH64ua6H1ct50VO0n | skipped | `purchase-flickr-downloader` | `prod_Sv6G6tvX60K1Or` | Payment link already present. |
| `freepik-downloader` | `price_1S99wt06JrOmKRCmUbw42qU9` | `9B600b62sf8O9Tddx90VO0o` | https://buy.stripe.com/9B600b62sf8O9Tddx90VO0o | skipped | `purchase-freepik-downloader` | `prod_Sv6GZOynqSmDlw` | Payment link already present. |
| `getty-images-downloader` | `price_1S99wt06JrOmKRCmxzY3jKYL` | `aFa14f9eEaSyfdx1Or0VO0p` | https://buy.stripe.com/aFa14f9eEaSyfdx1Or0VO0p | skipped | `purchase-getty-images-downloader` | `prod_Sv6GtDEForrzz0` | Payment link already present. |
| `giphy-downloader` | `price_1S99wu06JrOmKRCmq1ANhFue` | `28E5kvaiIbWC5CXakX0VO0q` | https://buy.stripe.com/28E5kvaiIbWC5CXakX0VO0q | skipped | `purchase-giphy-downloader` | `prod_Sv6HENVA7q2HeS` | Payment link already present. |
| `gohighlevel-downloader` | `price_1S99wu06JrOmKRCmfKo5Bl2z` | `fZu8wHeyYd0Ge9t78L0VO0r` | https://buy.stripe.com/fZu8wHeyYd0Ge9t78L0VO0r | skipped | `purchase-gohighlevel-downloader` | `prod_Sv6Hd3ZrTOyXTp` | Payment link already present. |
| `gokollab-downloader` | `price_1S99wv06JrOmKRCmyCPZfee1` | `4gM6oz0I8bWC1mHct50VO0s` | https://buy.stripe.com/4gM6oz0I8bWC1mHct50VO0s | skipped | `purchase-gokollab-downloader` | `prod_Sv6H8u0mXBxVHl` | Payment link already present. |
| `hulu-downloader` | `price_1S99wv06JrOmKRCmOtYb8mCE` | `3cI28j62s5ye6H1ct50VO0t` | https://buy.stripe.com/3cI28j62s5ye6H1ct50VO0t | skipped | `purchase-hulu-downloader` | `prod_Sv6H0Q1x2ohW8n` | Payment link already present. |
| `instagram-downloader` | `price_1S99wv06JrOmKRCm5BKNZ3Kj` | `dRmdR176wf8Oe9t50D0VO0u` | https://buy.stripe.com/dRmdR176wf8Oe9t50D0VO0u | skipped | `purchase-instagram-downloader` | `prod_Sv6HurnDKF4TUS` | Payment link already present. |
| `internet-archive-downloader` | `price_1S99ww06JrOmKRCmOPtNc4AC` | `00w00b1Mce4K2qL3Wz0VO0v` | https://buy.stripe.com/00w00b1Mce4K2qL3Wz0VO0v | skipped | `purchase-internet-archive-downloader` | `prod_Sv6HOnKhj7vvXt` | Payment link already present. |
| `istock-downloader` | `price_1S99ww06JrOmKRCmNqJ9zTSr` | `28E3cnaiI7Gmfdx3Wz0VO0w` | https://buy.stripe.com/28E3cnaiI7Gmfdx3Wz0VO0w | skipped | `purchase-istock-downloader` | `prod_Sv6HGOIclVxTWP` | Payment link already present. |
| `kajabi-video-downloader` | `price_1S99wx06JrOmKRCmFaiTWpCK` | `00w7sDduUe4KghBfFh0VO0x` | https://buy.stripe.com/00w7sDduUe4KghBfFh0VO0x | skipped | `purchase-kajabi-downloader` | `prod_Sv6HARVDc80PK1` | Payment link already present. |
| `khan-academy-downloader` | `price_1S99wx06JrOmKRCmqkFPnN9s` | `9B6dR1cqQ5yefdx0Kn0VO0y` | https://buy.stripe.com/9B6dR1cqQ5yefdx0Kn0VO0y | skipped | `purchase-khan-academy-downloader` | `prod_Sv6HO7CKmlA65g` | Payment link already present. |
| `kick-clip-downloader` | `price_1S99wx06JrOmKRCmTvX5yYRV` | `dRm28j76waSy8P9gJl0VO0z` | https://buy.stripe.com/dRm28j76waSy8P9gJl0VO0z | skipped | `purchase-kick-clip-downloader` | `prod_Sv6HB1QfBD03L4` | Payment link already present. |
| `learndash-downloader` | `price_1S99wy06JrOmKRCmGHe9PqqC` | `eVqbITgH67Gm0iD64H0VO0A` | https://buy.stripe.com/eVqbITgH67Gm0iD64H0VO0A | skipped | `purchase-learndash-downloader` | `prod_Sv6HclNUJPRYHM` | Payment link already present. |
| `learnworlds-downloader` | `price_1S99wz06JrOmKRCmFCzqKyrO` | `fZu14faiIf8O9TdakX0VO0B` | https://buy.stripe.com/fZu14faiIf8O9TdakX0VO0B | skipped | `purchase-learnworlds-downloader` | `prod_Sv6HyAc6gl3zkH` | Payment link already present. |
| `linkedin-learning-downloader` | `price_1S99fw06JrOmKRCm59JPeRdR` | `aFa3cnbmM8Kq7L58cP0VO0C` | https://buy.stripe.com/aFa3cnbmM8Kq7L58cP0VO0C | skipped | `purchase-linkedin-learning-downloader` | `prod_Sv6HSdCX0irIOM` | Payment link already present. |
| `livejasmin-downloader` | `price_1S99fx06JrOmKRCmMixxSD1b` | `9B600b8aA8Kq9Td0Kn0VO0D` | https://buy.stripe.com/9B600b8aA8Kq9Td0Kn0VO0D | skipped | `purchase-livejasmin-downloader` | `prod_Sv6Hc8d1H8bDcV` | Payment link already present. |
| `loom-video-downloader` | `price_1S9BFJ06JrOmKRCmdpVOP8Em` | `bJe6oz1McgcSaXheBd0VO0E` | https://buy.stripe.com/bJe6oz1McgcSaXheBd0VO0E | skipped | `purchase-loom-video-downloader` | `prod_SgQFDAZHJBdiRX` | Payment link already present. |
| `m3u8-downloader` | `price_1S99fx06JrOmKRCm2ECdO0oK` | `7sY6oz2Qgf8Oe9t0Kn0VO0F` | https://buy.stripe.com/7sY6oz2Qgf8Oe9t0Kn0VO0F | skipped | `purchase-m3u8-downloader` | `prod_Sv6HbJk6PCsyuX` | Payment link already present. |
| `moodle-downloader` | `price_1S99fx06JrOmKRCmleYZfn4W` | `3cIbITaiI1hYghBct50VO0G` | https://buy.stripe.com/3cIbITaiI1hYghBct50VO0G | skipped | `purchase-moodle-downloader` | `prod_Sv6HjTufnmO8Ix` | Payment link already present. |
| `myfreecams-downloader` | `price_1S99fy06JrOmKRCm9EKbadyO` | `aFa6oz0I83q6aXhfFh0VO0H` | https://buy.stripe.com/aFa6oz0I83q6aXhfFh0VO0H | skipped | `purchase-myfreecams-downloader` | `prod_Sv6HGhVctJPtsW` | Payment link already present. |
| `netflix-downloader` | `price_1S99fy06JrOmKRCmPkVYWIwk` | `9B6dR176we4K4yT1Or0VO0I` | https://buy.stripe.com/9B6dR176we4K4yT1Or0VO0I | skipped | `purchase-netflix-downloader` | `prod_Sv6HEnX6b3E502` | Payment link already present. |
| `nicovideo-downloader` | `price_1S99fz06JrOmKRCmxFh2vLWI` | `28EcMXgH61hYaXhgJl0VO0J` | https://buy.stripe.com/28EcMXgH61hYaXhgJl0VO0J | skipped | `purchase-nicovideo-downloader` | `prod_Sv6HqT3HxlU9od` | Payment link already present. |
| `onlyfans-downloader` | `price_1S99fz06JrOmKRCmwpZifMkf` | `dRm4grgH60dU9Td64H0VO0K` | https://buy.stripe.com/dRm4grgH60dU9Td64H0VO0K | skipped | `purchase-onlyfans-downloader` | `prod_Sv6HHbpO7I9vt0` | Payment link already present. |
| `patreon-downloader` | `price_1S99g006JrOmKRCmQ5WBiQuN` | `dRm14f62s8Kqe9t78L0VO0L` | https://buy.stripe.com/dRm14f62s8Kqe9t78L0VO0L | skipped | `purchase-patreon-downloader` | `prod_Sv6HwV7bdL3BDn` | Payment link already present. |
| `pdf-downloader` | `price_1S99g006JrOmKRCmVzelEW6H` | `cNi6ozbmMe4K7L550D0VO0M` | https://buy.stripe.com/cNi6ozbmMe4K7L550D0VO0M | skipped | `purchase-pdf-downloader` | `prod_Sv6HOiUUVHSA9S` | Payment link already present. |
| `pexels-video-downloader` | `price_1S99g106JrOmKRCmnvLb6LoL` | `aFa8wH2Qg1hYfdxct50VO0N` | https://buy.stripe.com/aFa8wH2Qg1hYfdxct50VO0N | skipped | `purchase-pexels-video-downloader` | `prod_Sv6HyGUyULY4PF` | Payment link already present. |
| `pinterest-downloader` | `price_1S99g106JrOmKRCmu5wfxl1Y` | `14A28jeyYgcS2qL8cP0VO0O` | https://buy.stripe.com/14A28jeyYgcS2qL8cP0VO0O | skipped | `purchase-pinterest-downloader` | `prod_Sv6HBa8kn17bpT` | Payment link already present. |
| `pixabay-downloader` | `price_1S99g106JrOmKRCmhuWBP77A` | `14AfZ9gH63q62qLakX0VO0P` | https://buy.stripe.com/14AfZ9gH63q62qLakX0VO0P | skipped | `purchase-pixabay-downloader` | `prod_Sv6HlYh52Z9mCt` | Payment link already present. |
| `podia-downloader` | `price_1S99g206JrOmKRCmS5hDrXoG` | `4gMeV5eyYd0Ge9t1Or0VO00` | https://buy.stripe.com/4gMeV5eyYd0Ge9t1Or0VO00 | skipped | `purchase-podia-downloader` | `prod_Sv6HIKHvUzdsQR` | Payment link already present. |
| `pornhub-video-downloader` | `price_1RvXN806JrOmKRCmg1bHRufg` | `3cI3cn8aAf8O7L50Kn0VO0Q` | https://buy.stripe.com/3cI3cn8aAf8O7L50Kn0VO0Q | skipped | `purchase-pornhub-video-downloader` | `prod_Sqsjylj8Z89k1v` | Payment link already present. |
| `rawpixel-downloader` | `price_1S99g206JrOmKRCm0DpSeCzS` | `dRmfZ93Ukf8O2qL50D0VO0R` | https://buy.stripe.com/dRmfZ93Ukf8O2qL50D0VO0R | skipped | `purchase-rawpixel-downloader` | `prod_Sv6HPS9K1S5ny3` | Payment link already present. |
| `redgifs-downloader` | `price_1S99g306JrOmKRCmP9M8EStc` | `6oUfZ98aAf8O1mH64H0VO0S` | https://buy.stripe.com/6oUfZ98aAf8O1mH64H0VO0S | skipped | `purchase-redgifs-downloader` | `prod_Sv6HU86lnZmPqb` | Payment link already present. |
| `redtube-video-downloader` | `price_1S99g406JrOmKRCmqPgLx00x` | `dRmeV5bmM2m2fdx2Sv0VO0T` | https://buy.stripe.com/dRmeV5bmM2m2fdx2Sv0VO0T | skipped | `purchase-redtube-downloader` | `prod_SrGTducRH5aPvE` | Payment link already present. |
| `serp-downloaders-bundle` | `price_1SIZI606JrOmKRCmSgAmUGTQ` | `plink_1SLAiK06JrOmKRCmkdSSDIxV` | https://buy.stripe.com/8x228jduUd0G1mH3Wz0VO1x | created | `purchase-serp-downloaders-bundle` | `prod_TF3OkFaJi31aur` | Cross-sell link (SERP Downloaders Bundle). |
| `scribd-downloader` | `price_1S99g406JrOmKRCm3s3fJ3xy` | `dRm8wH76w4ua2qL9gT0VO0U` | https://buy.stripe.com/dRm8wH76w4ua2qL9gT0VO0U | skipped | `purchase-scribd-downloader` | `prod_Sv6HBMDCDpiMPy` | Payment link already present. |
| `shutterstock-downloader` | `price_1S99g606JrOmKRCmsWNWNrdh` | `00w9ALaiIe4Kd5pbp10VO0V` | https://buy.stripe.com/00w9ALaiIe4Kd5pbp10VO0V | skipped | `purchase-shutterstock-downloader` | `prod_Sv6HY25dvlMUa3` | Payment link already present. |
| `skillshare-downloader` | `price_1S99g706JrOmKRCmWGVr96N6` | `6oUbIT8aAf8O2qL8cP0VO0W` | https://buy.stripe.com/6oUbIT8aAf8O2qL8cP0VO0W | skipped | `purchase-skillshare-downloader` | `prod_Sv6HHLNAQEaguS` | Payment link already present. |
| `skool-video-downloader` | `price_1SKxDw06JrOmKRCmxbxexLDR` | `8x228jfD2aSyc1l50D0VO0X` | https://buy.stripe.com/8x228jfD2aSyc1l50D0VO0X | skipped | `purchase-skool-video-downloader` | `prod_SgRUYSKnhuiXX6` | Payment link already present. |
| `snapchat-video-downloader` | `price_1S99g706JrOmKRCmt9pwi3AH` | `eVqfZ976w9Oue9tdx90VO0Y` | https://buy.stripe.com/eVqfZ976w9Oue9tdx90VO0Y | skipped | `purchase-snapchat-video-downloader` | `prod_Sv6HGmec4Qc0D6` | Payment link already present. |
| `soundcloud-downloader` | `price_1S99g806JrOmKRCmTl8grSWH` | `3cIaEP3Ukd0G1mH64H0VO0Z` | https://buy.stripe.com/3cIaEP3Ukd0G1mH64H0VO0Z | skipped | `purchase-soundcloud-downloader` | `prod_Sv6Hxkglswo3Dt` | Payment link already present. |
| `soundgasm-downloader` | `price_1S99g806JrOmKRCmB103AZJL` | `dRm28j9eE1hYfdxct50VO10` | https://buy.stripe.com/dRm28j9eE1hYfdxct50VO10 | skipped | `purchase-soundgasm-downloader` | `prod_Sv6Hx0pjXdNwM2` | Payment link already present. |
| `spankbang-video-downloader` | `price_1S9DXF06JrOmKRCmrbemGM9U` | `6oU9AL8aAbWC0iD50D0VO11` | https://buy.stripe.com/6oU9AL8aAbWC0iD50D0VO11 | skipped | `purchase-spankbang-downloader` | `prod_T5OJxcMDHKSqyk` | Payment link already present. |
| `sprout-video-downloader` | `price_1S99g906JrOmKRCmqpFh4LYc` | `3cIdR1aiI4ua9Tdct50VO12` | https://buy.stripe.com/3cIdR1aiI4ua9Tdct50VO12 | skipped | `purchase-sprout-video-downloader` | `prod_SqnfWNeyP5TUdt` | Payment link already present. |
| `stocksy-downloader` | `price_1S99g906JrOmKRCmaZzHAMEw` | `cNi7sD3Uk6Cic1l50D0VO13` | https://buy.stripe.com/cNi7sD3Uk6Cic1l50D0VO13 | skipped | `purchase-stocksy-downloader` | `prod_Sv6HBmlo3YNTe9` | Payment link already present. |
| `stockvault-downloader` | `price_1S99g906JrOmKRCmGb7sOQ2q` | `aFa7sD1Mcd0Gc1lct50VO14` | https://buy.stripe.com/aFa7sD1Mcd0Gc1lct50VO14 | skipped | `purchase-stockvault-downloader` | `prod_Sv6HzuwEQfZ23m` | Payment link already present. |
| `storyblocks-downloader` | `price_1S99gA06JrOmKRCmt3y1AyVP` | `7sY7sDaiI9Ou6H13Wz0VO15` | https://buy.stripe.com/7sY7sDaiI9Ou6H13Wz0VO15 | skipped | `purchase-storyblocks-downloader` | `prod_Sv6HlVQLlci5ux` | Payment link already present. |
| `stream-downloader` | `price_1S99gA06JrOmKRCmwsTNavsX` | `7sY3cn62s4uafdxakX0VO16` | https://buy.stripe.com/7sY3cn62s4uafdxakX0VO16 | skipped | `purchase-stream-downloader` | `prod_Sv6HYumVhrKaBc` | Payment link already present. |
| `stripchat-video-downloader` | `price_1S99gB06JrOmKRCmEwvJ6CbW` | `7sY9AL1Mcd0G1mH2Sv0VO17` | https://buy.stripe.com/7sY9AL1Mcd0G1mH2Sv0VO17 | skipped | `purchase-stripchat-video-downloader` | `prod_Sv6HInaMkSTtJg` | Payment link already present. |
| `teachable-video-downloader` | `price_1S99gB06JrOmKRCmO2gulXc5` | `3cIbITfD22m20iD2Sv0VO18` | https://buy.stripe.com/3cIbITfD22m20iD2Sv0VO18 | skipped | `purchase-teachable-video-downloader` | `prod_Sv6H2Dscvp1wGR` | Payment link already present. |
| `telegram-video-downloader` | `price_1S99gC06JrOmKRCm9XooPQNU` | `fZufZ91McaSye9teBd0VO19` | https://buy.stripe.com/fZufZ91McaSye9teBd0VO19 | skipped | `purchase-telegram-video-downloader` | `prod_Sv6HSk1Icz9UgH` | Payment link already present. |
| `terabox-downloader` | `price_1S99gC06JrOmKRCmY3kTiBht` | `6oU8wHfD22m24yTakX0VO1a` | https://buy.stripe.com/6oU8wHfD22m24yTakX0VO1a | skipped | `purchase-terabox-downloader` | `prod_Sv6Hbj1WFUcL4I` | Payment link already present. |
| `thinkific-downloader` | `price_1S99gE06JrOmKRCmEfjsFume` | `6oUeV5fD29Ouc1l0Kn0VO1b` | https://buy.stripe.com/6oUeV5fD29Ouc1l0Kn0VO1b | skipped | `purchase-thinkific-downloader` | `prod_Sv6Ip7FMh0twtd` | Payment link already present. |
| `thumbnail-downloader` | `price_1S99gE06JrOmKRCmHWXd57yx` | `bJe7sDaiI3q65CX1Or0VO1c` | https://buy.stripe.com/bJe7sDaiI3q65CX1Or0VO1c | skipped | `purchase-thumbnail-downloader` | `prod_Sv6HPWKdkZ86q4` | Payment link already present. |
| `tiktok-downloader` | `price_1S99gF06JrOmKRCmcKeM0NSp` | `00w9AL4Yo3q68P964H0VO1d` | https://buy.stripe.com/00w9AL4Yo3q68P964H0VO1d | skipped | `purchase-tiktok-downloader` | `prod_SqnavySFXhLMCk` | Payment link already present. |
| `tnaflix-video-downloader` | `price_1S99gF06JrOmKRCmxPX1Ip5o` | `8x2dR13UkgcS3uP3Wz0VO1e` | https://buy.stripe.com/8x2dR13UkgcS3uP3Wz0VO1e | skipped | `purchase-tnaflix-downloader` | `prod_SrGZUcdNEVvNsn` | Payment link already present. |
| `tubi-downloader` | `price_1S99gG06JrOmKRCmmZOSX7ah` | `00w8wHgH6e4Kfdx78L0VO1f` | https://buy.stripe.com/00w8wHgH6e4Kfdx78L0VO1f | skipped | `purchase-tubi-downloader` | `prod_Sv6HRal4WyIsIU` | Payment link already present. |
| `tumblr-video-downloader` | `price_1S99gG06JrOmKRCmVRscTagt` | `aFa28j8aA4ua4yT8cP0VO1g` | https://buy.stripe.com/aFa28j8aA4ua4yT8cP0VO1g | skipped | `purchase-tumblr-video-downloader` | `prod_Sv6Iw8vE3Ctg9j` | Payment link already present. |
| `twitch-video-downloader` | `price_1S99gH06JrOmKRCm3wdakg7Q` | `6oU7sDcqQ8Kq2qLct50VO1h` | https://buy.stripe.com/6oU7sDcqQ8Kq2qLct50VO1h | skipped | `purchase-twitch-video-downloader` | `prod_Sv6Iz6B925CR2f` | Payment link already present. |
| `twitter-video-downloader` | `price_1S99gH06JrOmKRCme009G5ob` | `fZudR1cqQ3q63uPdx90VO1i` | https://buy.stripe.com/fZudR1cqQ3q63uPdx90VO1i | skipped | `purchase-twitter-video-downloader` | `prod_Sv6IYwfGjAx4BQ` | Payment link already present. |
| `udemy-video-downloader` | `price_1S99gH06JrOmKRCmSnepXJPa` | `28E9AL4Yo9Ou8P964H0VO1j` | https://buy.stripe.com/28E9AL4Yo9Ou8P964H0VO1j | skipped | `purchase-udemy-video-downloader` | `prod_Sv6pwoyYNJYNSU` | Payment link already present. |
| `unsplash-downloader` | `price_1S99gI06JrOmKRCmA9xUhbN6` | `5kQ6oz62s0dU9TdeBd0VO1k` | https://buy.stripe.com/5kQ6oz62s0dU9TdeBd0VO1k | skipped | `purchase-unsplash-downloader` | `prod_Sv6Id9wmYp3UtU` | Payment link already present. |
| `vectorstock-downloader` | `price_1S99gI06JrOmKRCmTvjSmEWB` | `00w8wH0I87Gme9t50D0VO1l` | https://buy.stripe.com/00w8wH0I87Gme9t50D0VO1l | skipped | `purchase-vectorstock-downloader` | `prod_Sv6IjJtdp20ckj` | Payment link already present. |
| `vimeo-video-downloader` | `price_1S2fcZ06JrOmKRCmTwbmGNxm` | `5kQ14ffD20dUe9takX0VO1m` | https://buy.stripe.com/5kQ14ffD20dUe9takX0VO1m | skipped | `purchase-vimeo-video-downloader` | `prod_SgReFRh1TixiX4` | Payment link already present. |
| `vk-video-downloader` | `price_1S99gJ06JrOmKRCmzNGM97WE` | `dRm28j4Yo8Kq1mHfFh0VO1n` | https://buy.stripe.com/dRm28j4Yo8Kq1mHfFh0VO1n | skipped | `purchase-vk-video-downloader` | `prod_Sv6IUkORD1jr0m` | Payment link already present. |
| `whop-video-downloader` | `price_1S99gJ06JrOmKRCmkAYY713T` | `3cI8wH8aA8Kq6H164H0VO1o` | https://buy.stripe.com/3cI8wH8aA8Kq6H164H0VO1o | skipped | `purchase-whop-downloader` | `prod_Sv6Ie4IH2swYcq` | Payment link already present. |
| `wistia-video-downloader` | `price_1S99gJ06JrOmKRCmN3MovrlF` | `3cI6ozaiIbWCfdx0Kn0VO1p` | https://buy.stripe.com/3cI6ozaiIbWCfdx0Kn0VO1p | skipped | `purchase-wistia-downloader` | `prod_SqneqGTUexmjwU` | Payment link already present. |
| `xhamster-video-downloader` | `price_1RvXdF06JrOmKRCmSniyO7DT` | `5kQ6ozfD27Gmfdx2Sv0VO1q` | https://buy.stripe.com/5kQ6ozfD27Gmfdx2Sv0VO1q | skipped | `purchase-xhamster-downloader` | `prod_SrFXX6huXVaXb9` | Payment link already present. |
| `xnxx-video-downloader` | `price_1S9PBd06JrOmKRCmvSxzbjnz` | `8x29AL0I88Kq3uP8cP0VO1v` | https://buy.stripe.com/8x29AL0I88Kq3uP8cP0VO1v | skipped | `purchase-xnxx-downloader` | `prod_SrGYKrazcfgi5G` | Payment link already present. |
| `xvideos-downloader` | `price_1S99gL06JrOmKRCmtPCthojb` | `aFa14ffD23q6aXh3Wz0VO1r` | https://buy.stripe.com/aFa14ffD23q6aXh3Wz0VO1r | skipped | `purchase-xvideos-downloader` | `prod_SrGW6pAdy73l9t` | Payment link already present. |
| `youporn-video-downloader` | `price_1RvXMm06JrOmKRCmEXZ7GsiQ` | `fZudR1fD23q6e9t8cP0VO1s` | https://buy.stripe.com/fZudR1fD23q6e9t8cP0VO1s | skipped | `purchase-youporn-downloader` | `prod_SrFXRIL4LAgGyt` | Payment link already present. |
| `youtube-downloader` | `price_1S99xB06JrOmKRCmCyZM0ENF` | `eVq00b8aA6CiaXhbp10VO1t` | https://buy.stripe.com/eVq00b8aA6CiaXhbp10VO1t | skipped | `purchase-youtube-downloader` | `prod_Sv6I9QH5ZJMOSn` | Payment link already present. |

_Note: Re-run this script after adding new products to Stripe to keep URLs in sync._
