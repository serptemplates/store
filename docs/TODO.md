# TODO

## Auth + Entitlements

- Keep serp-auth `entitlement_catalog` as the canonical source of truth; maintain `entitlement_aliases` for legacy names.
- Store product JSONs must use canonical slugs (bundle canonicals: `serp-downloaders-bundle`, `all-adult-video-downloaders-bundle`; alias `all-video-downloaders-bundle` is accepted but should not be emitted).
- Entitlement lint is wired into `pnpm lint` via `validate:entitlements`.
  - Requires `INTERNAL_ENTITLEMENTS_TOKEN` for `/internal/entitlements/catalog` (preferred) or the D1 fallback credentials.
- Cleanup follow-ups:
  - Retire GHL tags from downstream flows when safe.
  - Remove license-key provisioning once `ai-voice-cloner` no longer depends on `serp-license-keys`.

## Thank You Page

- Confirm whether `/account` and verification email flows can be deprecated and remove the route if safe.
- Replace any remaining CTAs/resources with the correct serp-auth access flow after `/account` removal.

## Completed

- Updated `apps/store/app/checkout/success/SuccessContent.tsx` to remove account/license-key messaging and extra hero variants (kept the Stripe copy).
- Hid the hero video while awaiting a replacement.
