# SERP Auth bundle entitlements plan

## Background
- Store checkout currently sends three things:
  - GHL tags (kept for now; no longer used downstream).
  - Legacy license keys (still needed for ai-voice-cloner; clean up later).
  - SERP Auth entitlements (current canonical source).
- Store now validates entitlements against SERP Auth D1 using `apps/store/scripts/validate-entitlements.ts`.
- Canonical entitlements live in D1 `entitlement_catalog` and legacy names in `entitlement_aliases`.

## Goal
- Support bundle purchases without updating store or extensions whenever new downloaders ship.
- Keep a single source of truth in SERP Auth for canonical entitlements and bundle membership.
- Provide linting and audit logs for entitlement grants and bundle expansion.

## Recommended approach (default)
- Add bundle entitlements in SERP Auth (canonical list):
  - `all-video-downloaders-bundle`
  - `all-adult-video-downloaders-bundle`
- Store grants only the bundle entitlement for bundle purchases.
- SERP Auth expands bundle entitlements into the full set at grant/authorize time.
- Membership is defined in D1 by tags or explicit group tables (see below).
- Extensions continue to check only their specific entitlement; no client updates required.

## D1 schema options
Option A (recommended for auto-include):
- Use `entitlement_catalog.metadata_json` tags (example: `{"tags":["video-downloader","adult"]}`).
- SERP Auth expands bundles based on tags.
- Pros: new downloaders are automatically included once tagged.
- Cons: requires a tagging process and validation.

Option B (explicit lists):
- Add tables:
  - `entitlement_groups` (`name`, `description`)
  - `entitlement_group_members` (`group_name`, `entitlement_name`)
- Pros: explicit membership.
- Cons: needs manual updates for each new downloader.

## SERP Auth changes (to implement in serp-auth repo)
- Add bundle entitlements to `entitlement_catalog`.
- Add tags or group membership for all downloaders.
- Add expansion logic in the entitlement grant flow and entitlement check flow.
- Add verbose logs for: input entitlements, expanded list, missing/unknown, counts.
- Add internal endpoint to return catalog + aliases (+ groups or tags) for linting:
  - `GET /internal/entitlements/catalog`

## Store changes (this repo, later)
- For bundle products, set `licenseEntitlements` to the bundle entitlement only.
- Keep `validate-entitlements` lint script wired to SERP Auth catalog endpoint or D1.

## Operational notes
- Keep GHL tags and legacy license keys for now; note cleanup tasks.
- Keep `entitlement_aliases` for legacy names (for example `*-video-downloader`).

## TODO (serp-auth)
- [ ] Confirm bundle canonical names and add them to `entitlement_catalog`.
- [ ] Decide group schema (tags vs explicit group tables).
- [ ] Implement expansion logic + logging.
- [ ] Implement `/internal/entitlements/catalog` response (entitlements + aliases + groups/tags).
- [ ] Add tests for expansion logic and alias handling.

## TODO (store)
- [ ] Update bundle product JSON entitlements to use bundle canonical names only.
- [ ] Add or update docs explaining tags/legacy license keys/entitlements.
- [ ] Update Thank You page references to license keys and `/account`.

