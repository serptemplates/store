# SERP Store Monorepo

This repo powers the SERP store at https://apps.serp.co. It includes the Next.js storefront, shared UI primitives, and the scripts/docs that manage product JSON, Stripe checkout, GHL sync, and serp-auth entitlement grants.

## Quick start

```bash
pnpm install
pnpm dev
```

Create a local `.env` at the repo root before running the app. See `docs/operations/env-files.md` for the exact env layout and required keys.

## Common commands

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:smoke
pnpm validate:products
```

## Repo structure

```
apps/store/     Next.js app (routes, APIs, checkout, account)
packages/ui/   Shared UI components
docs/          Architecture, operations, runbooks, data notes
scripts/       Repo-level automation (Stripe, merchant feeds, syncs)
```

## Documentation

Start at `docs/README.md` for the doc index, then follow:

- `docs/architecture/checkout-overview.md`
- `docs/operations/store-deployment.md`
- `apps/store/data/README.md`

## Notes

- This is a PNPM workspace. Root scripts run against the `@apps/store` package by default.
- Product content lives in `apps/store/data/products/*.json` and is validated by `pnpm validate:products`.
