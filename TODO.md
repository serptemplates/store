## Cleanup unused product layouts

- [x] Removed `apps/store/components/product/layouts/EcommerceLayout.tsx` plus dependent helpers (`apps/store/components/product/types.ts`, everything in `apps/store/components/product/hybrid/`, `apps/store/components/product/ProductInfoSection.tsx`, and `apps/store/tests/component/hybrid/HybridProductOverview.test.tsx`). `apps/store/components/product/layouts/MarketplaceLayout.tsx` remains for `status: "pre_release"` products.
- [x] Deleted the dead routing branch in `apps/store/app/[slug]/page.tsx` and removed the lazy wrapper `apps/store/app/[slug]/hybrid-page.tsx`.
- [x] Eliminated `apps/store/components/product/pages/HybridProductPageView.tsx` and `apps/store/components/product/pages/ProductPageView.tsx`.
- [x] Updated docs (`docs/architecture/marketplace-lander.md`) and other references to stop recommending `layout_type: ecommerce`.
- [x] Checked for `satellites/apps/_store/...`; directory not present, so no mirrored deletions required.
- [x] After the removals, ran `pnpm lint`, `pnpm typecheck`, and `pnpm test:unit` to confirm no stray imports or tests still point at the deleted modules.
