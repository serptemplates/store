# Component Organization & Consolidation Plan

This document captures the current component layers in the store monorepo and the cleanup work completed while investigating issue #64. It should help new contributors understand where component code belongs and how to keep things tidy as we grow.

## Component layers
- **packages/ui** - shared, styled primitives (buttons, cards, form fields, etc.) that are safe to consume from any app.
- **packages/templates** - reusable page sections and higher-level assemblies that stitch primitives together for landing pages and product flows.
- **apps/store/components** - application-specific components that depend on store data, routing, and business logic (`@/components/*`).
- **docs/store** - process and operational docs only; no runtime components should live here.

## Cleanup in this pass
- Removed the unused `components/commerce/*` directory that duplicated template sections but was never imported.
- Deleted the checked-in `apps/store/mobile-optimizations` examples; the sample generator now lives at `scripts/store/optimize-mobile-performance.js` and writes fresh snippets when needed.
- Updated helper scripts so they run from the repository root and live alongside the other operational tooling in `scripts/store`.
- Reorganized `apps/store/lib` into domain folders (`account/`, `checkout/`, `payments/`, `notifications/`, `products/`) so application code can locate dependencies quickly without sifting through a flat directory.

## Guidelines going forward
- Put design-system style building blocks in `packages/ui`, and export them through `packages/ui/src/index.ts`.
- Add reusable product/marketing sections to `packages/templates` so both the store app and external consumers can share them.
- Keep store-specific wiring (data fetching, routing, auth, analytics hooks) inside `apps/store/components`.
- If a component currently in `apps/store/components` proves reusable elsewhere, promote it into `packages/templates` (or `packages/ui` if it is purely presentational) and re-export it there before deleting the original copy.
- Avoid adding new top-level `components/` folders at the repo root; that space is intentionally reserved now.

## Follow-up ideas
- Audit `apps/store/components` for candidates to promote into `packages/templates`, especially sections that already match the template layer naming (FAQ, hero variants, pricing blocks).
- Add lint rules or a simple unit test to catch imports from non-existent `components/*` paths so the duplication does not creep back in.
- Expand the Playwright smoke tests to cover the hybrid product page and ensure template refactors remain safe.
