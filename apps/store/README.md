# apps.serp.co - Deployment & Configuration Guide

## Project Overview
This is the main SERP Apps store application deployed at https://apps.serp.co

## Vercel Configuration

### Project Details
- **Vercel Project Name**: `apps.serp.co`
- **Project ID**: `prj_Q3foxpYmgnDaloVMPd2CpiuxEb30`
- **Organization**: `serpcompany`
- **Production URL**: https://apps.serp.co

### Directory Structure
```
/store (monorepo root)
├── package.json          # Workspace configuration
├── pnpm-workspace.yaml   # PNPM workspace settings
├── .env                  # Shared environment variables
└── apps/
    └── store/           # THIS APP (Vercel deploys from here)
        ├── vercel.json   # Vercel build configuration
        ├── .vercel/      # Vercel project link (gitignored)
        ├── .next/        # Build output (gitignored)
        ├── app/          # Next.js app directory
        │   ├── layout.tsx    # Contains GTM integration
        │   └── sitemap.ts    # Dynamic sitemap generation
        └── data/
            └── site.config.json  # Site configuration & GTM ID
```

## Build Configuration

### vercel.json
Located at `/apps/store/vercel.json`:
```json
{
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm --filter @apps/store build",
  "outputDirectory": ".next",
  "crons": [
    {
      "path": "/api/monitoring/health?alert=1",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Important**: Commands navigate up to monorepo root (`../..`) to run PNPM workspace commands.

### Build Process
1. Vercel clones repo and enters `/apps/store/` directory
2. Runs install command (navigates to root, installs all dependencies)
3. Runs build command (navigates to root, builds this specific app)
4. Serves the `.next` directory from `/apps/store/`

## Key Features

### XML Sitemap
- **URL**: https://apps.serp.co/sitemap.xml
- **File**: `/apps/store/app/sitemap.ts`
- Automatically generates URLs for all products in `/data/products/*.yaml`
- Updates on each build

### Google Tag Manager
- **Container ID**: `GTM-WS97TH45`
- **Config File**: `/apps/store/data/site.config.json`
- **Implementation**: `/apps/store/app/layout.tsx`
- Loads on all pages for analytics tracking

## Local Development

### Setup
```bash
# From monorepo root
pnpm install
pnpm dev  # Runs the store app specifically
```

### Environment Variables
- **Local**: Create `.env.local` in `/apps/store/`
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

### GHL Integration Checks

Use the focused integration specs to validate that GHL receives the new metadata payloads for each provider:

```bash
# Stripe → GHL
pnpm --filter @apps/store exec vitest run tests/integration/stripe-ghl-flow.test.ts

# PayPal → GHL
pnpm --filter @apps/store exec vitest run tests/integration/paypal-ghl-flow.test.ts
```

Both tests create synthetic orders, replay the provider-specific webhook, and assert that:

- Orders persist with the correct `source` (`stripe` or `paypal`).
- Checkout sessions gain `ghlSyncedAt`/`ghlContactId` metadata.
- The GoHighLevel contact contains the JSON blobs in `contact.purchase_metadata` and `contact.license_keys_v2`.

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

1. **Never commit** `.vercel/` or `.env.local` files
2. **Always deploy** from `/apps/store/` directory, not monorepo root
3. **GTM Container** (`GTM-WS97TH45`) is shared across the store
4. **Build commands** must navigate to monorepo root to access PNPM workspace

## Support

For deployment issues:
1. Check Vercel deployment logs: `vercel logs [deployment-url]`
2. Verify project link: `cat .vercel/project.json`
3. Test build locally: `cd ../.. && pnpm --filter @apps/store build`
