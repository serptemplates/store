# Stripe Webhook Architecture

The Stripe webhook handler lives at `app/api/stripe/webhook/route.ts` and delegates to modular helpers under `apps/store/lib/payments/stripe-webhook/`. This split keeps the route thin and makes it easier to reason about new event types.

## Event flow

1. The route verifies the payload with `stripe.webhooks.constructEvent` and hands off to `handleStripeEvent`.
2. `handleStripeEvent` routes the event to one of the handlers under `events/`.
   - `events/checkout-session-completed.ts` – Persists the session, creates licenses, queues GHL sync, and fires analytics.
   - `events/payment-intent-succeeded.ts` – Marks orders paid and closes outstanding sessions.
   - `events/payment-intent-failed.ts` – Flags orders as failed and triggers retryable alerts.
   - `events/unhandled-event.ts` – Logs and returns gracefully for events we do not yet support.
3. Shared helpers under `helpers/` encapsulate cross-cutting logic:
   - `helpers/ghl-sync.ts` – Retry/backoff loop for GoHighLevel calls (unit-tested via `helpers/ghl-sync.test.ts`).
   - `helpers/license.ts` – Normalizes metadata and calls `@/lib/license-service`.
   - `helpers/metadata.ts` – Extracts and reshapes event metadata for persistence.

## Persistence touchpoints

- Stripe session and order updates funnel through the `@/lib/checkout` facade. Do not import private modules directly.
- Because the storefront creates Checkout Sessions server-side, the handler relies on metadata stored on Stripe products and prices (e.g., `offerId`, `landerId`, `ghl_tag`, `product_slug`). Keep the backfill script (`apps/store/scripts/update-stripe-product-tags.ts`) up to date so webhooks remain deterministic.
- License creation goes through `@/lib/license-service`, which has its own modular breakdown (`request.ts`, `creation.ts`, etc.).
- Analytics and alerting flow through `@/lib/analytics/checkout-server` and `@/lib/ops/alerts`.

## Testing strategy

- API-level coverage lives in `tests/api/stripe-webhook.test.ts`.
- Retry logic is unit-tested in `lib/payments/stripe-webhook/helpers/ghl-sync.test.ts`.
- End-to-end coverage exercises CTA navigation + Checkout Session creation (see `tests/e2e/stripe-checkout.test.ts` for CTA behaviour).

When you add a new event type:

1. Create a handler under `events/`.
2. Export it from `index.ts` and register it in `handleStripeEvent`.
3. Extend the API tests with fixtures that cover the new event and expected side-effects.
4. Run the acceptance stack (`pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:smoke`).
