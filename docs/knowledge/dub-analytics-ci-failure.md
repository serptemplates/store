# Dub analytics CI failures (PR #397)

## Symptom
- `pnpm -w -C apps/store test:unit` fails on `tests/unit/analytics/dub-analytics-config.test.tsx`.
- Missing `script[data-sdkn="@dub/analytics"]` when `NEXT_PUBLIC_DUB_PUBLISHABLE_KEY` is not set.

## Cause
- `resolveDubConfig` started requiring a publishable key to set `enabled`, so `DubAnalytics` returned `null` even in production/preview runtimes.
- Unit tests expect the script to be injected in production/preview, with conversion tracking disabled when the key is missing.

## Fix
- In `apps/store/lib/analytics/runtime-config.ts`, set `enabled` to `isProductionRuntime` (not gated by publishable key).
- In `apps/store/components/analytics/DubAnalytics.tsx`, do not early-return when the key is missing; just warn in non-production.

## Verification
- `pnpm -w -C apps/store test:unit`
- `pnpm -w lint`
- `pnpm -w typecheck`
- `pnpm --filter @apps/store validate:products`
