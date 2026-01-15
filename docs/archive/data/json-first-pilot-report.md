# JSON-First Pilot Report

Date: 2025-02-14  
Owner: Platform Content Team

## Pilot scope
- Converted the following product data sources to canonical JSON while retaining their legacy YAML counterparts:
  - `123movies-downloader`
  - `ai-voice-cloner-app`
  - `tests/fixtures/products/test-product`
- Regenerated CLI tooling (`pnpm --filter @apps/store convert:products`) to guarantee deterministic key ordering and capture warnings for stale fields.

## Validation summary
- ✅ `pnpm --filter @apps/store lint`
- ✅ `pnpm --filter @apps/store typecheck`
- ✅ `pnpm --filter @apps/store test:unit`
- ✅ `pnpm --filter @apps/store validate:products`
- ✅ `pnpm --filter @apps/store stripe:sync-payment-links` (live execution; updated 95 links)

## Developer feedback requests
Please review the generated JSON files under `apps/store/data/products/*.json` (pilot slugs listed above) and share feedback on:
- Field ordering & readability (should we collapse certain nested blocks or keep expanded?)
- Diff ergonomics compared to YAML when editing marketing copy
- Additional tooling required (formatters, editors, syntax highlighting)
- Need for roll-back scripts or YAML regeneration support

Feedback channels:
- Leave comments on the shared Notion doc: **JSON-first Migration Feedback**
- Drop quick notes in #storefront-dev with the tag `#json-first`
- For blocking issues, open a GitHub issue labelled `json-migration` so we can track fixes before Stage 6.

## Known follow-ups
- Stripe sync lacks a dry-run mode; we should scope an option before full migration to reduce external side effects during content edits.
- Determine preferred JSON formatting rules (indent size, trailing commas) and wire them into lint/format tasks.
- Confirm if product editors require auxiliary tooling (e.g., VS Code snippets) to replace the inline YAML comments they previously relied on.

## Target decision date
- Collect feedback by **2025-02-21** so we can commit to the Stage 6 cleanup (YAML removal) and guardrail work in the following sprint.
