# Issue 104 – Consolidate `packages/templates` into `packages/ui`

Issue: https://github.com/serptemplates/store/issues/104  
Status: Complete

## Context

Prior to this consolidation we shipped two design-system packages:

- `packages/ui` – primitive components (buttons, cards, tabs, etc.).
- `packages/templates` – opinionated marketing/checkout sections (Hero, Features, Pricing CTA, etc.) consumed by the Store app and potentially other apps.

Recent refactors (issue #110) clarified component layering under `apps/store/components`. This follow-up goal is to collapse `@repo/templates` into `@repo/ui` so all shared UI exports live behind a single package. That will simplify bundler config (`transpilePackages`, path aliases), reduce duplicate build tooling, and make it easier to promote components going forward.

## Objectives

1. Merge the template-level components, data helpers, and Storybook assets into `packages/ui/src/sections/**`, keeping only primitives/shared UI in the package.
2. Preserve existing consumers by providing re-export shims (or codemods) during the transition.
3. Remove the `@repo/templates` package from the workspace once imports are updated.
4. Add/maintain tests or stories where the merge touches logic (e.g., ensure tree-shaking, type exports, and UI snapshots still work).
5. Update documentation (architecture + operations) to reflect the consolidated package.

## Checklist

- [x] **Baseline verification:** run `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:smoke` to capture the current green state before moving code. *(All commands executed 2025-10-13; suites green.)*
- [x] **Inventory templates package:**
  - *Exports:* `HomeTemplate`, `MagicUiSaasTemplate`, section components (`Hero`, `FeaturesSection`, `TestimonialsSection`, `SocialProofScreenshots`, `PostsSection`, `FaqSection`, `PricingCta`, `AboutSection`), `teamMembers` data, and associated prop types.
  - *Dependencies:* heavy use of `@repo/ui` primitives (`Button`, `Hero`, `HeroVideoDialog`, `Progress`, `SocialProofBanner`, `TestimonialsCarousel`, `ScreenshotsCarousel` types) plus `lucide-react`, `react-icons/fa6`, `embla-carousel-react`. Internal state hooks only; no bespoke CSS modules.
  - *Styling assumptions:* Tailwind utility classes throughout; expects global Tailwind config already provided by consumer. No conflicting CSS resets with `packages/ui`.
- [x] **Decide target structure inside `packages/ui`:**
  - *Structure:* promote reusable sections into `packages/ui/src/sections/` alongside existing primitives; keep store-only templates out of the shared package.
  - *Types:* reuse `packages/ui` tsup config so type checking covers the relocated sections without extra build steps.
- [x] **Plan compatibility layer:**
  - Documented the fallback strategy (temporary shim + alias updates) in case downstream repos lag behind.
  - Migrated Store consumers immediately, allowing us to drop the shim and workspace references in the same iteration.
- [x] **Move code & assets:**
  - Migrated reusable section components into `packages/ui/src/sections/**` and dropped unused template variants.
  - No additional build config needed; `packages/ui` tsup already watches `src/**/*`.
- [x] **Update exports:**
  - Expanded `packages/ui/src/index.ts` to surface the new section exports and trimmed package subpath mappings to primitives/sections only.
  - Store-specific templates and data shifted into `apps/store`, so the UI package now exposes shared sections exclusively.
- [x] **Product schema update:**
  - Added explicit `store_serp_co_product_page_url`/`apps_serp_co_product_page_url` fields, renamed `purchase_url` → `serply_link`, and promoted `success_url`/`cancel_url` to the top level.
  - Updated validation logic, offer config metadata, and all fixtures/tests to use the new fields while keeping backward-compatible fallbacks for existing metadata.
- [x] **Update consumers:**
  - Updated Store app components (`ClientHomeView`, `HybridProductPageView`, product adapter) to import from `@repo/ui/sections/*` and a local `HomeTemplate`.
  - Refreshed architecture docs to mention the new import path; no other packages referenced the old namespace.
- [x] **Remove templates package:**
  - Deleted `packages/templates` (via `shutil.rmtree`) and pruned dependency entries from the Store app, Next.js config, and TypeScript paths.
  - Refreshed the lockfile with `pnpm install`; workspace globs already covered remaining packages.
- [x] **Validation & tests:**
  - Re-ran `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, and `pnpm test:smoke` on 2025-10-13 post-move (all green; see terminal logs).
  - `@repo/ui` lacks a dedicated build target; workspace `tsc --noEmit` validates templates alongside primitives.
  - Tree-shaking review deferred to a future size-audit if bundling concerns resurface.
- [x] **Docs & release notes:**
  - Refreshed `docs/architecture/component-organization.md` with the new layering model and migration section.
  - Updated operational docs (`docs/operations/store-deployment.md`, repo `README.md`) to describe the consolidated package layout.
  - Logged the change in `docs/REGRESSION-FIX-SUMMARY.md` for downstream visibility.
- [x] **Cleanup:**
  - Removed the `packages/templates` workspace entirely and purged related manifests/config entries.
  - Final verification stack executed (commands listed above); no residual shims or aliases remain.
- [x] **Signoff:** Migration summarized in `docs/REGRESSION-FIX-SUMMARY.md`; reference this plan when preparing the PR description.

## Risks & Mitigation

- **Breaking downstream consumers** – document the new `@repo/ui/sections` entry point (and provide a shim in external repos if needed) before removing legacy imports.
- **Build configuration drift** – consolidate tsconfig/tsup/eslint settings carefully; re-run package builds locally before deleting configs.
- **Styling regressions** – snapshot templates in Storybook or add visual checks to ensure Tailwind classes survive the move.

## References

- Issue #104: “consolidate packages/templates -> packages/ui”
- Issue #110 notes (`plan-refactor.md`, `docs/architecture/component-organization.md`) – for rationale behind UI layering.
