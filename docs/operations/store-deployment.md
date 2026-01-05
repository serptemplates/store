# apps.serp.co – Deployment & Operations Guide

## Application overview

The Store app (`@apps/store`) powers https://apps.serp.co. It is deployed on Vercel and ships the hosted checkout redirect, Stripe Checkout/Payment Link integration, GHL sync, and serp-auth entitlement grants. License-key orchestration remains for legacy flows (currently only `ai-voice-cloner`). Legacy PayPal orders remain in the database for historical reporting.

Key directories:

```
/ (repo root)
├── apps/store/                # Store Next.js app
│   ├── app/                   # Route handlers and pages
│   ├── lib/checkout/          # Checkout helpers (sessions, orders, validation)
│   ├── lib/payments/stripe-webhook/  # Stripe webhook dispatcher + helpers
│   ├── scripts/               # CLI utilities & manual test harnesses
│   └── playwright.config.ts   # Smoke suite configuration
├── packages/ui/               # Shared primitives and sections (`src/sections/**`)
└── docs/                      # Current documentation set (see docs/README.md)
```

## Vercel project

- **Project**: `apps.serp.co`
- **Org**: `serpcompany`
- **Production URL**: https://apps.serp.co
- **`vercel.json`** (`apps/store/vercel.json`)
  - `installCommand`: `cd ../.. && pnpm install --frozen-lockfile`
  - `buildCommand`: `cd ../.. && pnpm --filter @apps/store build`
  - Cron: `/api/monitoring/health?alert=1` nightly

Vercel executes the commands from the app folder, hence the `cd ../..` before each workspace command.

## Verification checklist (run locally before merging)

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:smoke
```

The smoke suite (`pnpm test:smoke`) launches Playwright’s Desktop Chrome project and covers:

- Homepage render
- Product page render and checkout CTA sanity
- Stripe checkout redirect happy path

For full end-to-end coverage (including Stripe CLI forwarding) use:

```bash
pnpm --filter @apps/store test:e2e
```

## Runtime touchpoints

- **XML sitemap** – `/app/sitemap.ts`, exported at https://apps.serp.co/sitemap.xml. It enumerates products from `apps/store/data/products/*.json`.
- **Google Tag Manager** – Configured in `apps/store/data/site.config.json` (container `GTM-WS97TH45`) and wired through `app/layout.tsx`.
- **Health checks** – `/api/monitoring/health` (called nightly via Vercel cron) and the Playwright smoke run.

## Environment variables

- Local development: `.env` at repo root.
- CI / Vercel: manage through the Vercel dashboard (`Settings → Environment Variables`).
- Scripts: use `loadScriptEnvironment` from `apps/store/scripts/utils/env.ts` when authoring new CLIs so they load `.env` files the same way as `update-video-metadata.ts` and `revoke-refunded-licenses.ts`.

## Manual diagnostics

The ad-hoc harnesses under `apps/store/scripts/manual-tests/` are still handy for on-call debugging. Each loads env vars via the shared utility described above.

| Script | Purpose |
| --- | --- |
| `npx tsx scripts/manual-tests/acceptance-test.ts` | Full Stripe checkout simulation (webhooks + GHL sync). |
| `npx tsx scripts/manual-tests/test-payment-flow.ts` | Fast preflight for DB + Stripe connectivity. |
| `npx tsx scripts/manual-tests/test-stripe-direct.ts` | Direct Stripe SDK sanity check (no UI). |
| `npx tsx scripts/manual-tests/test-dub-attribution.ts` | Exercises Dub attribution flow + Checkout Session creation. |
| `npx tsx scripts/manual-tests/test-ghl-direct.ts` (and friends) | Exercises GoHighLevel APIs directly. |

## GHL integration checks

Use the automation harnesses when validating metadata changes:

```bash
# Checkout session health check

pnpm --filter @apps/store exec tsx scripts/manual-tests/test-payment-flow.ts

# Legacy PayPal → GHL integration spec

> Historical reference only. No new PayPal orders are created, but past integrations remain documented here for archival purposes.
pnpm --filter @apps/store exec vitest run tests/integration/paypal-ghl-flow.test.ts
```

These checks assert that:

- Orders persist with the correct source + metadata.
- Checkout sessions record `ghlSyncedAt` / `ghlContactId`.
- GoHighLevel contacts receive the JSON payloads in `contact.purchase_metadata` and `contact.license_keys_v2` (license keys are legacy; entitlements are the primary access signal).
- The webhook no longer overwrites prior purchase metadata; new orders are inserted as the top-level JSON object and previous purchases remain available under `previousPurchases[]` on the same field for audit trails.

Override the default field keys with `GHL_CUSTOM_FIELD_PURCHASE_METADATA` / `GHL_CUSTOM_FIELD_LICENSE_KEYS_V2` when a location deviates from the default schema.

## Local Development

### Setup
```bash
# From monorepo root
pnpm install
pnpm dev  # Runs the store app specifically
```

### Environment Variables
- **Local**: Create `.env` at the repo root
- **Production**: Set in Vercel Dashboard → Settings → Environment Variables

### Checkout E2E Verification
Run the combined end-to-end suite. The script auto-starts the dev server and Stripe CLI listener if they aren’t already running:

```bash
pnpm --filter @apps/store test:e2e
```

This sequentially:
1. Spins up `pnpm dev` and `stripe listen --forward-to http://localhost:3000/api/stripe/webhook` when needed
2. Drives the lander → Stripe Checkout → thank-you path via Playwright
3. Runs the automated payment flow (Stripe session, database persistence, GHL sync)
4. Executes the acceptance suite to validate email, Postgres, Stripe, and GHL automation hooks

Review Stripe (test mode), your inbox, Postgres, and GoHighLevel afterward to inspect the generated artifacts.

### Manual Diagnostics

For deeper troubleshooting you can run the ad-hoc harnesses under `apps/store/scripts/manual-tests/` (all of them load env vars from the project root):

- `acceptance-test.ts` – full end-to-end flow with Stripe Checkout, Postgres, and GHL (`npx tsx scripts/manual-tests/acceptance-test.ts`).
- `test-payment-flow.ts` – quick environment/database sanity check (`npx tsx scripts/manual-tests/test-payment-flow.ts`).
- `test-purchase-flow.ts` – replays a synthetic `checkout.session.completed` event against the webhook (`npx tsx scripts/manual-tests/test-purchase-flow.ts`).
- `test-ghl-direct.ts`, `test-ghl-api-direct.ts`, `test-exact-request.ts` – focused GHL connectivity probes (`npx tsx scripts/manual-tests/<script>.ts`).
- `test_checkout_with_playwright.py`, `inspect_checkout.py` – interactive Playwright runs (`python scripts/manual-tests/<script>.py`).

Keep them handy for ops-on-call scenarios; they’re excluded from automated test runs by design.

### GHL Integration Checks

Use the focused integration specs to validate that GHL receives the new metadata payloads for each provider:

```bash
# Stripe → GHL
pnpm --filter @apps/store exec vitest run tests/integration/stripe-ghl-flow.test.ts

# Legacy PayPal → GHL

> Historical reference only. Use the Stripe Payment Link flow for all new work.
pnpm --filter @apps/store exec vitest run tests/integration/paypal-ghl-flow.test.ts
```

Both tests create synthetic orders, replay the provider-specific webhook, and assert that:

- Orders persist with the correct `source` (`stripe` or `paypal`).
- Checkout sessions gain `ghlSyncedAt`/`ghlContactId` metadata.
- The GoHighLevel contact contains the JSON blobs in `contact.purchase_metadata` and `contact.license_keys_v2` (license keys are legacy; entitlements are the primary access signal).

> The runtime auto-discovers those custom fields by key. If your GoHighLevel location exposes `contact.purchase_metadata` and `contact.license_keys_v2`, no extra configuration is required. Optional overrides remain available via `GHL_CUSTOM_FIELD_PURCHASE_METADATA` and `GHL_CUSTOM_FIELD_LICENSE_KEYS_V2`.

## Deployment

### Via CLI
```bash
# From /apps/store directory
vercel              # Deploy to preview
vercel --prod       # Deploy to production
```

### Via GitHub
- Pushes to `main` branch auto-deploy to production
- Pull requests create preview deployments

## Troubleshooting

### Common Issues

#### 1. Sitemap Returns 404
- Check that `sitemap.ts` is in `/app/` directory
- Verify build output includes the route
- Ensure `NEXT_PUBLIC_SITE_URL` or domain in config is correct

#### 2. GTM Not Loading
- Verify `gtmId` is set in `/data/site.config.json`
- Check that `getSiteConfig()` is correctly reading the config
- Ensure no build errors in `layout.tsx`

#### 3. Build Fails with Path Errors
- Verify `vercel.json` paths are correct (`cd ../..` for monorepo root)
- Check `outputDirectory` is `.next` (not `apps/store/.next`)
- Ensure PNPM workspace is properly configured

#### 4. Wrong Project Deploys
- Delete `.vercel` folder and re-link:
  ```bash
  rm -rf .vercel
  vercel link --project apps.serp.co --yes
  ```

### Monitoring
- Health check endpoint: `/api/monitoring/health`
- Runs daily via Vercel Cron (configured in `vercel.json`)

## Important Notes

1. **Never commit** `.vercel/` or `.env` files
2. **Always deploy** from `/apps/store/` directory, not monorepo root
3. **GTM Container** (`GTM-WS97TH45`) is shared across the store
4. **Build commands** must navigate to monorepo root to access PNPM workspace

## Support

For deployment issues:
1. Check Vercel deployment logs: `vercel logs [deployment-url]`
2. Verify project link: `cat .vercel/project.json`
3. Test build locally: `cd ../.. && pnpm --filter @apps/store build`
