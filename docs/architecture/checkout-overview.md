# Checkout Module Overview

The storefront now owns Stripe Checkout Session creation for every product CTA. `pricing.cta_href` always points to `/checkout/<slug>` (or the absolute equivalent on apps.serp.co), and the route handler at `app/checkout/[slug]/route.ts` creates the Checkout Session server-side. The React hook behind the buy button simply records analytics, enforces waitlist behaviour for pre-release products, and lets the browser navigate directly to the internal checkout route. The `@/lib/checkout` facade still owns persistence, webhook handling, and reporting so downstream systems retain a single integration surface (legacy PayPal records are treated as `legacy_paypal` sources).

## Public facade

Import everything through `@/lib/checkout`. The facade re-exports the canonical types and helpers:

- `sessions.ts` – CRUD helpers for checkout sessions (insert/update/status transitions, stale session pruning).
- `orders.ts` – Order upsert helpers, metadata updates, and reporting hooks that operate on orders.
- `queries.ts` – Read-only reporting helpers (`findRecentOrdersByEmail`, `countPendingCheckoutSessionsOlderThan`, etc.).
- `types.ts` – Shared enums and record shapes to keep inter-module imports stable.

## Checkout entry points

### Internal checkout CTA

- Product JSON now declares `pricing.cta_href` values that always point to `/checkout/<slug>` (absolute URLs are fine for schema validation; runtime normalizes them to relative paths).
- `product-adapter` resolves CTAs to `mode: "checkout"` for every live product, so downstream components can assume the CTA is internal.
- `useProductCheckoutCta` tracks CTA analytics, opens the waitlist modal for `status === "pre_release"`, and normalizes navigation so every click lands on `/checkout/<slug>` (or the provided waitlist URL). Session creation happens inside the route handler, not in the client hook.
- Metadata required for fulfilment (e.g., `offerId`, `ghl_tag`, `stripe_product_id`) must be stored on the Stripe price/product so webhooks can recover it—our sync scripts backfill these tags.
- The success page only relies on `session_id` (or `payment_id` for GHL) plus the `slug`/`provider` query params. No additional identifiers are required for dedupe because Checkout Sessions are now created server-side.

## Post-purchase processing

- `app/api/stripe/webhook/route.ts` handles `checkout.session.completed` events emitted by the programmatic Checkout Sessions. Because the storefront still relies on Stripe metadata for fulfilment, ensure Stripe product metadata includes the GHL tag, lander/offer IDs, and any fulfilment hints.
- The `/checkout/success` route still processes a session on demand for local/testing environments when webhooks are unavailable. It retrieves the Stripe session directly, persists orders, and provisions licenses as a fallback path.
- Historical PayPal orders remain in the database as `legacy_paypal` sources; the checkout persistence layer normalizes them alongside Stripe sessions for reporting.

## Legacy `/checkout` behaviour

- `/checkout` now performs a static redirect back to the product slug (or home) so old deep links do not 404. There is no server action or session creation there.
- `/checkout/cancel` and `/checkout/success` remain available because third-party cancel/success URLs still point at them. Cancel simply links back to the product page, while success renders order status using the shared components.
- Middleware rewrites like `/ghl/checkout` → `/checkout` remain for backwards compatibility but no longer create sessions.

## Adding new checkout flows

1. Prefer the existing `/checkout/[slug]` workflow for new Stripe surfaces. If a CTA must behave differently, add a new route handler that mirrors the existing metadata/fulfilment pipeline rather than reintroducing client-side session creation.
2. If you must add another provider, place the API route under `app/api/<provider>` and reuse the `@/lib/checkout` persistence helpers for consistency.
3. Extend Vitest coverage for any new helpers under `apps/store/tests/**`, and keep E2E coverage in Playwright focused on CTA navigation + `/checkout/<slug>` rather than Payment Link redirects.
4. Run the acceptance stack when shipping changes: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:smoke`.
