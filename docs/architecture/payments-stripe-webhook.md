# Stripe Webhook Architecture

The Stripe webhook handler lives at `apps/store/app/api/stripe/webhook/route.ts`. It delegates to `apps/store/lib/payments/stripe-webhook/` so each event has a focused handler.

## Event flow

1. The route verifies the payload with `stripe.webhooks.constructEvent`.
2. `handleStripeEvent` (in `handler.ts`) selects the correct event handler under `events/`.
3. Event handlers persist checkout session data, resolve entitlements, and trigger downstream syncs.

## Event handlers

- `checkout-session-completed.ts`
  - Persists checkout sessions and orders via `@/lib/checkout`.
  - Resolves entitlements from offer + line item slugs (bundle expansion included).
  - Calls `processFulfilledOrder`, which triggers serp-auth grants, GHL sync, Crisp sync, and optional license service calls.
  - Writes webhook logs via `@/lib/webhook-logs`.
- `payment-intent-succeeded.ts` / `payment-intent-failed.ts`
  - Marks orders paid/failed and updates checkout session metadata.
- `charge-refunded.ts`, `charge-dispute-created.ts`, `charge-dispute-closed.ts`
  - Revokes or re-grants Stripe customer entitlements via `@/lib/payments/stripe-entitlements` (gated by `STRIPE_ENTITLEMENTS_ENABLED`).
- `unhandled-event.ts`
  - Logs and exits for unsupported events.

## Persistence touchpoints

- `@/lib/checkout` is the canonical persistence layer for checkout sessions and orders.
- `@/lib/webhook-logs` tracks webhook processing status and is used by monitoring endpoints.
- Metadata normalization uses `apps/store/lib/payments/stripe-webhook/metadata.ts` and the metadata helpers in `@/lib/metadata`.

## Entitlements

- Entitlements are resolved in `checkout-session-completed.ts` and stored in metadata as `license_entitlements_resolved` (comma separated) and `license_entitlements_resolved_count`.
- Entitlements are granted to serp-auth using `@/lib/serp-auth/entitlements` when `INTERNAL_ENTITLEMENTS_TOKEN` (or `SERP_AUTH_INTERNAL_SECRET`) is set.
- Bundle slugs must be canonical (`serp-downloaders-bundle`, `all-adult-video-downloaders-bundle`). `all-video-downloaders-bundle` is accepted for legacy input but should not be emitted.

## License service (legacy)

`processFulfilledOrder` posts to the license service when `LICENSE_ADMIN_URL` and its token are configured. The webhook itself does not call the license service directly.

## Tests

- `apps/store/tests/integration/api/stripe-webhook.test.ts` covers API-level webhook behavior.
- `apps/store/tests/integration/stripe-live.test.ts` and `apps/store/tests/integration/stripe-cross-sells-live.test.ts` cover live Stripe validations (manual/env gated).
- Playwright smoke coverage lives under `apps/store/tests/e2e/`.
