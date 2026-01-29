# Sync serp-db software to store product JSON

Use this when creating or updating a store product from `serp-db` (e.g., `serp-video-tools`).

- Export canonical content from serp-db: `pnpm -C apps/db export-software:live -- --slug <slug>`.
- Map fields:
  - `features[]` ← `features[].label` (exact text).
  - `faqs[]` ← `faqs[]` (as-is).
  - `permission_justifications[]` ← `permissionJustifications[]`.
- Media lives in `apps/store/public/media/products/<slug>/`; reference with `/media/products/<slug>/...` in `featured_image` and `screenshots`.
- Set `status: "live"` only after `payment.stripe.price_id` is present (validation fails otherwise).
- Add/verify entitlements in serp-auth `entitlement_catalog` with `metadata_json.tags` (e.g., `video-downloader`) so linting and bundle expansion work.
