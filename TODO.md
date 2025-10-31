## Cleanup unused product layouts

- [x] Removed `apps/store/components/product/layouts/EcommerceLayout.tsx` plus dependent helpers (`apps/store/components/product/types.ts`, everything in `apps/store/components/product/hybrid/`, `apps/store/components/product/ProductInfoSection.tsx`, and `apps/store/tests/component/hybrid/HybridProductOverview.test.tsx`). `apps/store/components/product/layouts/MarketplaceLayout.tsx` remains for `status: "pre_release"` products.
- [x] Deleted the dead routing branch in `apps/store/app/[slug]/page.tsx` and removed the lazy wrapper `apps/store/app/[slug]/hybrid-page.tsx`.
- [x] Eliminated `apps/store/components/product/pages/HybridProductPageView.tsx` and `apps/store/components/product/pages/ProductPageView.tsx`.
- [x] Updated docs (`docs/architecture/marketplace-lander.md`) and other references to stop recommending `layout_type: ecommerce`.
- [x] Checked for `satellites/apps/_store/...`; directory not present, so no mirrored deletions required.
- [x] After the removals, ran `pnpm lint`, `pnpm typecheck`, and `pnpm test:unit` to confirm no stray imports or tests still point at the deleted modules.

## Product lander modularity follow-up

- [x] Extract shared view-model builders for marketplace and default landers into `apps/store/lib/products/view-model.ts` with unit tests.
- [x] Introduce reusable sections (`ProductLinksRail`, `ProductPermissionsAccordion`, `ProductHeroMedia`) so landers compose common UI instead of duplicating markup.
- [x] Slim `MarketplaceProductPageView` and `HomeTemplate` to orchestration layers (<150 lines) by moving defaults/helper logic into dedicated modules (`home-template.view-model.ts`, `useMarketplaceProductPageViewModel.tsx`) and documenting the layout interface.
- [x] Consolidate CTA resolution, waitlist modal wiring, and analytics effects used in both landers into a shared hook (e.g. `useProductPageExperience`) consumed by `ClientHomeView` and `MarketplaceProductPageView`.
- [x] Promote the sticky CTA patterns (`StickyProductCTA` in the default lander and `StickyPurchaseBar` in the marketplace lander) into a single reusable component with styling variants.
- [x] Extract the product metadata/resource link assembly (`buildMetadataRows` and `ProductResourceLinks`) into a shared utility to keep SERP/ProductHunt/etc. link logic in one place.
- [x] Factor the inline video gallery in `ClientHomeView` into a `ProductVideosSection` component shared by both landers, with coverage for empty-state handling.
- [x] Move `buildMarketplaceCopy`, FAQ/permission/review mappers, and related helpers out of `MarketplaceProductPageView` into tested view-model modules so the component stays declarative.
- [x] Align permission justification rendering by adapting `PermissionsJustificationAccordion` to accept the shared mapper output and reuse it in the marketplace lander instead of reformatting into `FaqAccordion`.
