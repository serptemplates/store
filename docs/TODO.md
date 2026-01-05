# TODO

## Auth + Entitlements

- Define entitlements source of truth and add validation:
  - Confirm serp-auth DB table name and read-only access method.
  - Populate `entitlement_catalog` with canonical names and map legacy names in `entitlement_aliases`.
  - Add a script to fetch the official entitlement slugs and lint `apps/store/data/products/*` entitlements against it.
  - Wire the lint into existing checks (e.g., `pnpm lint` or a dedicated `validate:entitlements`).
  - Log and surface mismatches clearly for fast triage.

## Thank You Page

- Update `apps/store/app/checkout/success/SuccessContent.tsx` to remove account/license-key messaging.
- Replace CTAs/resources with the correct serp-auth access flow.
- Confirm whether `/account` and verification email flows should be deprecated or removed after the update.
