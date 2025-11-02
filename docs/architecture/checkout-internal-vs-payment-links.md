# Checkout: Internal API vs Payment Links

This document explains how product CTAs resolve to checkout, how the `/checkout/[slug]` route creates Stripe Checkout Sessions with required metadata, and why we no longer fall back to Stripe Payment Links from that route.

## TL;DR

- Use the internal route for purchases: `/checkout/:slug`.
- CTAs should point to `https://apps.serp.co/checkout/:slug` in product content; the client normalizes this to a relative path on localhost for dev.
- The server route creates a Checkout Session via Stripe API with:
  - `consent_collection.terms_of_service = required`
  - `customer_creation = always`
  - Full metadata (product_slug, Dub IDs if present, GHL tags)
- If Stripe session creation fails, the route returns a 500 (it does not redirect to a Payment Link).
- Payment Links still exist in product content for external tools and legacy flows; they are not used by the internal checkout route.

## CTA Resolution

Codepath: `apps/store/lib/products/product-adapter.ts` and `apps/store/components/product/landers/default/ClientHomeView.tsx`.

- If the product’s `pricing.cta_href` or `buy_button_destination` points at `/checkout/:slug` (or `https://apps.serp.co/checkout/:slug`) and the product is not `pre_release`, that wins.
- Otherwise, we may render a Payment Link or other external destination, depending on content.
- On localhost, the client view rewrites `https://apps.serp.co/checkout/:slug` to `/checkout/:slug` so clicks hit the local dev server.

For Circle (example):
- `apps/store/data/products/circle-downloader.json` sets `pricing.cta_href` to `https://apps.serp.co/checkout/circle-downloader`.

## Internal Checkout Route

Codepath: `apps/store/app/checkout/[slug]/route.ts`.

Key behavior:
- Accepts `GET /checkout/:slug[?qty=&email=]`.
- Rejects pre-release products by redirecting to a waitlist anchor.
- Loads offer config (price, URLs, metadata) from product JSON.
- Reads `dub_id` cookie to attach Dub attribution:
  - `metadata.dubCustomerExternalId`, `metadata.dubClickId`
  - `client_reference_id`
- Mirrors GHL tags into `metadata` (`ghl_tag`, `ghl_tag_ids`).
- Requires ToS consent and always creates a Stripe customer.
- Mirrors `metadata` to `payment_intent_data` (or `subscription_data`).

Failure policy:
- No Payment Link fallback. If session creation fails, we return a 500 JSON with an error that starts with `stripe_session_create_failed:`. This prevents silent redirection to `buy.stripe.com`.

## Environment-Aware Price Resolution

Problem: Test Stripe credentials can’t see live `price_…` IDs. Previously this caused session creation to fail and the route to fall back to a Payment Link.

Solution:
- `resolvePriceForEnvironment()` (in `apps/store/lib/payments/stripe.ts`) is used by the route to fetch a usable price for the current mode. In test mode, it will auto-clone a matching test price if a live key is configured; otherwise it throws with a clear message.
- The route uses the resolved `price.id` for `line_items`, guaranteeing API session creation works in both live and test.

## How to Test Locally

1. Set environment in `/.env`:
   - `STRIPE_SECRET_KEY_TEST=sk_test_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...`
   - `STRIPE_WEBHOOK_SECRET_TEST=whsec_...` (for webhook testing)
2. Start dev: `pnpm --filter @apps/store dev`
3. Visit a product page, e.g. `http://localhost:3000/circle-downloader` and click the CTA.
   - On localhost, the anchor should be `/checkout/circle-downloader`.
4. Or hit the route directly:
   - `curl -i http://localhost:3000/checkout/circle-downloader`
   - Expect `302` with `Location: https://checkout.stripe.com/c/pay/cs_test_...`.
5. In Stripe Workbench, verify:
   - `payment_link` is `null`.
   - `consent_collection.terms_of_service` is `required`.
   - `customer_creation` is `always`.
   - `metadata.product_slug` and Dub fields are present (if you had a `dub_id` cookie).

If you see `buy.stripe.com` (Payment Link), you are not hitting `/checkout/:slug`, or session creation failed and (in older builds) fell back. In current code, failure returns 500 instead of falling back, making the issue visible.

## Why Payment Links Are Still in Content

We retain `payment_link` in product JSON for:
- External scripts that sync/update Payment Links (e.g., metadata tags, cross-sells).
- Legacy landers or external campaigns that still target Payment Links directly.

But the internal checkout route does not consume `payment_link` and won’t redirect to it on error.

## Related Files

- `apps/store/app/checkout/[slug]/route.ts` – Internal API checkout (creates Stripe sessions)
- `apps/store/lib/payments/stripe.ts` – Stripe client helpers and environment-aware price resolution
- `apps/store/lib/products/offer-config.ts` – Offer derivation from product JSON
- `apps/store/lib/products/product-adapter.ts` – CTA resolution logic
- `apps/store/components/product/landers/default/ClientHomeView.tsx` – Client-side CTA normalization on localhost
