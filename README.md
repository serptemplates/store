# SERP Apps Store

This repository now focuses exclusively on the `@apps/store` Next.js commerce application and its shared component libraries. Satellite marketing sites and their deployment tooling live in a separate repository.

## Directory Overview

- `apps/store` – production storefront deployed to `https://apps.serp.co`
- `packages/ui` – shared UI primitives consumed by the store
- `packages/templates` – marketing page sections used across store product and blog pages
- `sites/apps.serp.co` – markdown blog content and store-level site metadata

## Local Development

```bash
pnpm install
pnpm dev
```

The dev script runs `@apps/store` on port 3000. See `docs/store/README.md` for detailed product management and testing workflows.

## Blog Content

- Store blog posts live under `sites/apps.serp.co/content/blog`
- Markdown/MDX files are loaded by `apps/store/lib/blog.ts`
- Front matter supports `draft`, `tags`, `description`, and optional hero images

## Stripe Price Sync

- CI automatically runs `pnpm sync:stripe-prices` on pushes to `main` and commits price updates when Stripe amounts change.
- To refresh prices manually, ensure `STRIPE_SECRET_KEY` (or `STRIPE_SECRET_KEY_TEST`) is available in your environment or `.env`, then run:

```bash
pnpm sync:stripe-prices
```

This updates each product YAML with formatted pricing pulled from Stripe.

## Stripe Checkout

For the checkout to work properly, set these environment variables in `.env.local`:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
