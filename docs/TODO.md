# TODO

## Auth + Entitlements

- Keep serp-auth `entitlement_catalog` as the canonical source of truth; maintain `entitlement_aliases` for legacy names.
- Store product JSONs must use canonical slugs (bundle canonicals: `serp-downloaders-bundle`, `all-adult-video-downloaders-bundle`; alias `all-video-downloaders-bundle` is accepted but should not be emitted).
- Entitlement lint is wired into `pnpm lint` via `validate:entitlements`.
  - Requires `INTERNAL_ENTITLEMENTS_TOKEN` (preferred) or `SERP_AUTH_INTERNAL_SECRET` for `/internal/entitlements/catalog`, or the D1 fallback credentials.
- Cleanup follow-ups:
  - Retire GHL tags from downstream flows when safe.
  - Remove license-key provisioning once `ai-voice-cloner` no longer depends on `serp-license-keys`.

## Stripe Webhooks

- [x] Update subscription invoice payment intents to use invoice metadata/line items when checkout session mapping is missing.
- [x] Fix `apps/store/scripts/run-checkout-e2e.ts` to capture Stripe CLI webhook secret from stderr (current listener hangs waiting on stdout).
- [x] Document invoice payment intent description updates in `docs/architecture/payments-stripe-webhook.md`.

## CI

- [x] Fix `staging-ci.yml` matrix indentation so `lighthouse` runs within `matrix.include`.
