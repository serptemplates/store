# apps.serp.co Deployment Guide

## Overview

The Store app (`@apps/store`) powers https://apps.serp.co. It is a Next.js app deployed on Vercel, using Stripe Checkout, serp-auth entitlements, and GoHighLevel sync. License keys are legacy and only generated when license service env vars are present.

Key directories:

```
apps/store/     Next.js app (routes, APIs, checkout, account)
packages/ui/   Shared UI components
apps/store/data/ Product JSON and schema
apps/store/scripts/ Manual test harnesses and CLI utilities
docs/          Architecture + operations docs
```

## Vercel project

- Project: `apps.serp.co`
- Org: `serpcompany`
- Production URL: https://apps.serp.co
- `apps/store/vercel.json` sets workspace build commands.

## Verification checklist (local)

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:smoke
pnpm validate:products
pnpm --filter @apps/store test:axe
```

For end-to-end checkout coverage (Stripe CLI + Playwright), run:

```bash
pnpm --filter @apps/store test:e2e
```

## Manual diagnostics

Common manual scripts (run from repo root):

```bash
pnpm --filter @apps/store exec tsx scripts/manual-tests/run.ts list
pnpm --filter @apps/store exec tsx scripts/manual-tests/run.ts acceptance
pnpm --filter @apps/store exec tsx scripts/manual-tests/run.ts payment-flow
pnpm --filter @apps/store exec tsx scripts/manual-tests/run.ts stripe-direct
pnpm --filter @apps/store exec tsx scripts/manual-tests/run.ts ghl-direct
pnpm --filter @apps/store exec tsx scripts/manual-tests/run.ts ghl-api-direct
pnpm --filter @apps/store exec tsx scripts/manual-tests/run.ts exact-request
pnpm --filter @apps/store exec tsx scripts/manual-tests/run.ts dub-attribution
```

The wrapper script proxies to the existing files under `apps/store/scripts/manual-tests/` (replay webhook events, inspect webhook logs, serp-auth grant probes, etc.). All scripts load `.env` via `apps/store/scripts/utils/env.ts`.

## GHL integration checks

- The webhook writes purchase metadata to `contact.purchase_metadata` and legacy license payloads to `contact.license_keys_v2`.
- Override field ids with `GHL_CUSTOM_FIELD_PURCHASE_METADATA` and `GHL_CUSTOM_FIELD_LICENSE_KEYS_V2` if your GHL location differs.
- `helpers/ghl-sync.ts` retries 3 times with exponential backoff.

## Deployment

### Vercel CLI

```bash
vercel
vercel --prod
```

### GitHub

- Pushes to `main` deploy to production.
- Pull requests create preview deployments.

## Monitoring

- Health endpoint: `/api/monitoring/health` (supports `?alert=1`)
- Entitlements retry endpoint: `/api/monitoring/entitlements/retry`
- Ops alerts post to `OPS_ALERT_WEBHOOK_URL` (fallback: `SLACK_ALERT_WEBHOOK_URL`)

## Troubleshooting

- **Sitemap 404**: verify `apps/store/app/sitemap.ts` and `NEXT_PUBLIC_SITE_URL`.
- **GTM not loading**: confirm `NEXT_PUBLIC_GTM_ID` (or `data/site.config.json` default) and check `app/layout.tsx`.
- **Wrong Vercel project**: remove `.vercel` and relink:
  ```bash
  rm -rf .vercel
  vercel link --project apps.serp.co --yes
  ```
