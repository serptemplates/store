# Checkout Module Overview

The storefront no longer brokers custom Stripe sessions. Product CTAs resolve to Stripe or GoHighLevel Payment Links, and the only server-managed checkout surface is PayPal. The `@/lib/checkout` facade still owns persistence, webhook handling, and reporting so downstream systems retain a single integration surface.

## Public facade

Import everything through `@/lib/checkout`. The facade re-exports the canonical types and helpers:

- `sessions.ts` – CRUD helpers for checkout sessions (insert/update/status transitions, stale session pruning).
- `orders.ts` – Order upsert helpers, metadata updates, and reporting hooks that operate on orders.
- `queries.ts` – Read-only reporting helpers (`findRecentOrdersByEmail`, `countPendingCheckoutSessionsOlderThan`, etc.).
- `types.ts` – Shared enums and record shapes to keep inter-module imports stable.

## Checkout entry points

### Stripe Payment Links

- Product YAMLs now declare `payment_link` fields (Stripe live/test URLs or a GoHighLevel payment URL).
- `resolveProductPaymentLink` chooses the correct link based on environment (test vs. live) and feeds the CTA helpers.
- `useProductCheckoutCta` opens the Payment Link in a new tab, tracks analytics, and triggers the waitlist modal for pre-release products.
- Metadata required for fulfilment (e.g., `offerId`, `ghl_tag`) must be stored on the Stripe product or price so webhooks can recover it—our sync scripts backfill these tags.

### PayPal API route

- `app/api/paypal/create-order/route.ts` remains the only server-side checkout creator. It validates payloads, applies coupons, persists a checkout session, and returns the PayPal approval link.
- The route uses the same persistence helpers exported by `@/lib/checkout`, so webhook and reporting logic continue to work without bespoke plumbing.

## Post-purchase processing

- `app/api/stripe/webhook/route.ts` handles `checkout.session.completed` events emitted by Payment Links. Because the storefront no longer writes session metadata, ensure Stripe product metadata (or the Payment Link itself) includes the GHL tag, lander/offer IDs, and any fulfilment hints.
- The `/checkout/success` route still processes a session on demand for local/testing environments when webhooks are unavailable. It retrieves the Stripe session directly, persists orders, and provisions licenses as a fallback path.
- PayPal webhooks and manual polling continue to share the checkout session persistence layer; metadata mirrors the Stripe shape with `source=paypal`.

## Legacy `/checkout` behaviour

- `/checkout` now performs a static redirect back to the product slug (or home) so old deep links do not 404. There is no server action or session creation there.
- `/checkout/cancel` and `/checkout/success` remain available because third-party cancel/success URLs still point at them. Cancel simply links back to the product page, while success renders order status using the shared components.
- Middleware rewrites like `/ghl/checkout` → `/checkout` remain for backwards compatibility but no longer create sessions.

## Adding new checkout flows

1. Prefer Payment Links for any future Stripe surface. Configure new links in the Stripe dashboard and store the URLs + metadata in product YAML.
2. If you must add a server-driven checkout (e.g., another PSP), place the route under `app/api/<provider>` and reuse the `@/lib/checkout` persistence helpers for consistency.
3. Extend Vitest coverage for any new helpers under `apps/store/tests/**`, and keep E2E coverage in Playwright focused on CTA navigation rather than session payloads.
4. Run the acceptance stack when shipping changes: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:smoke`.
