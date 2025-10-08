# TODO for Issue #60 – misc repo updates

## Deprecate Creative Market listing
- [x] Hide `creative-market-downloader` from storefront listings by updating `apps/store/data/site.config.json` (add slug to `excludeSlugs`).
- [x] Remove `apps/store/data/products/creative-market-downloader.yaml` and update collateral (`apps/store/lib/brand-logos.ts`, `docs/offer-catalog.csv`, pricing data, etc.).
- [x] Confirm navigation, sitemap, and marketing assets no longer surface Creative Market.

## Prune unused site deployments
- [x] Delete legacy site folders under `sites/` except `sites/apps.serp.co/` and verify no tooling expects the removed directories.
- [x] Revisit `.gitignore` overrides or deployment scripts to ensure they still make sense after the cleanup.

## Lighthouse report hygiene
- [x] Move the lighthouse / mobile report artifacts in `apps/store/` (e.g., `lighthouse-*.json`, `mobile-report.*`, `run-lighthouse-mobile.js` outputs) into a dedicated `apps/store/reports/` directory.
- [x] Add the new reports directory to `.gitignore` and update any scripts or docs that point at the old paths.

## Remove the demo route
- [x] Delete `apps/store/app/demo/page.tsx` (and the folder) so `/demo` stops building.
- [x] Update or remove references to demo routes in middleware, tests, or docs (`apps/store/middleware.ts`, `apps/store/test-mobile-responsiveness.ts`, etc.) to avoid dead links.

## Consolidate store documentation
- [x] Relocate standalone Markdown docs from `apps/store/*.md` into a `docs/store/` section to keep documentation centralized.
- [x] Fix internal links and README references after the files move (search the repo for the old filenames).

## Product YAML corrections
- [x] Reset `product_page_url`, `stripe.success_url`, and `stripe.cancel_url` to the `apps.serp.co` domain for the slugs listed in the issue (`loom-video-downloader`, `pornhub-video-downloader`, `skool-video-downloader`, `vimeo-video-downloader`, `whop-video-downloader`, `xvideos-downloader`, `tiktok-downloader`, `wistia-video-downloader`, `sprout-video-downloader`, `youtube-downloader`, `123movies-downloader`, `circle-downloader`, `kajabi-video-downloader`, `m3u8-downloader`).
- [x] Align `ghl.tag_ids` with the provided values (notably update `whop-video-downloader` → `purchase-whop-downloader` and `kajabi-video-downloader` → `purchase-kajabi-downloader`).
- [x] Set `buy_button_destination` to the supplied payment link for each product (fill in missing values for `youtube-downloader`, `circle-downloader`, `kajabi-video-downloader`, `m3u8-downloader`).
- [x] Double-check remaining fields (like `purchase_url`) against the spreadsheet in the issue and flag any extra discrepancies.

## Verification
- [ ] Use the Playwright MCP server to capture browser console and network logs when smoke-testing product pages after the edits. (Attempted; blocked by sandbox from binding to port 3000.)
- [x] Run `pnpm lint` and `pnpm typecheck` and confirm zero errors/warnings before shipping the branch.
