# Component Organization

The store app now leans on a clear separation between the design system packages, app-specific wiring, and the new checkout submodules. Use this document as the sourcing guide when you add or relocate UI code.

## Layers at a glance

- **`packages/ui`** – Source of truth for shared UI. Primitives live at the package root (`src/button`, `src/card`, etc.) while higher-level sections live under `src/sections/**`. Everything in this package must stay framework-agnostic and avoid app-specific logic.
- **`apps/store/components`** – Store-specific wiring that touches routing, data fetching, analytics, or checkout orchestration. Examples include the product CTA logic (legacy PayPal helpers have been removed).
- Product landers follow the same rule: keep `HomeTemplate` and `MarketplaceProductPageView` as orchestration layers while pushing derived data and defaults into `apps/store/components/product/landers/default/home-template.view-model.ts` and `apps/store/components/product/landers/marketplace/useMarketplaceProductPageViewModel.tsx`.
- **`apps/store/app`** – Next.js routes that stitch the UI with server actions and fetchers. Route-level components should stay lean by delegating most markup to `components/`.
- **`apps/store/lib`** – Domain logic split by capability (`checkout/`, `payments/`, `license-service/`, `ghl-client/`, etc.). UI components should only import the facades exposed by these folders (e.g., `@/lib/checkout`), never the private helpers.

## Checkout routing conventions

- Product CTAs call `useProductCheckoutCta`, which resolves the correct Payment Link (Stripe or GHL), records analytics, and opens the destination in a new tab.
- The `/checkout` route now acts as a static redirect back to the product slug (or home) for legacy deep links. No session API calls occur there.
- Avoid reintroducing bespoke forms or credit-card elements; Stripe handles the payment surface entirely.

## Promotion checklist

When a component currently in `apps/store/components` proves reusable for other apps:

1. Move the JSX into `packages/ui`:
   - Primitives → `src/` next to existing atoms.
   - Marketing/landing sections → `src/sections/` (add a folder if a new section category is needed).
2. Export it from `packages/ui/src/index.ts` (add a small barrel if the section family grows).
3. Replace the store import path with the new `@repo/ui/...` entry point, and delete the original component.
4. Update or add stories/tests in `packages/ui` to keep coverage local to the component.

## Guardrails

- Avoid adding new top-level folders under `apps/store/components` unless the scope is broad (e.g., `checkout/`, `product/`). Small domains should live under the nearest existing folder.
- UI code should never import private helpers from `apps/store/lib/**/internal`. Always use the public facades so refactors stay localized.
- Use the Playwright smoke suite (`pnpm test:smoke`) after significant UI moves; it covers the product lander and checkout redirect.

## Migration: `@repo/templates` → consolidated UI

- Replace any lingering `@repo/templates` imports with the appropriate `@repo/ui/sections/*` export or a store-local component (e.g., `ClientHomeView/HomeTemplate` now lives in the app).
- Update TypeScript path aliases and Next.js `transpilePackages` so they only reference `@repo/ui`; no extra package entries are needed.
- Delete any residual `packages/templates` artefacts in downstream repos—shared sections now reside under `packages/ui/src/sections/**`.
- If another project still expects the old namespace, add a temporary shim that re-exports from the new `@repo/ui/sections/*` paths while you migrate.
