# Marketplace Lander (Product Page)

This document describes the new marketplace-style product lander, how to enable it per product, and what content it renders. Use this when you want a product page with a clean overview, a main hero video, compact media rows, and related content at the bottom.

## Enable per product

Products live in `apps/store/data/products/<slug>.json`. Set `status: "pre_release"` to activate the marketplace lander.

Routing logic: `apps/store/app/[slug]/page.tsx` chooses the layout at request time.

## Content sources (JSON)

- Main hero video: first URL in `product_videos` (falls back to `related_videos` where needed for rows)
- Screenshots: `screenshots` entries (URLs); also uses `featured_image` as a fallback
- Related posts: `related_posts` – array of blog slugs; order is preserved
- Features: `features` – rendered in the Features section
<<<<<<< HEAD
- Pricing/CTA: `pricing.cta_text` plus the price manifest (`apps/store/data/prices/manifest.json`); CTA URL is derived from `/checkout/<slug>`
=======
- Pricing/CTA: `pricing.cta_text` plus the price manifest (`apps/store/data/prices/manifest.json`); CTA URL is derived from `/checkout/<slug>` using `ROUTES.checkout`
>>>>>>> 34aba1f4 (clean up dry up store repo)
- Metadata: `brand`, `categories`, `keywords`, `supported_*`, `permission_justifications`, etc.

## Page structure (marketplace lander)

Rendered by `MarketplaceProductPageView`:

1. Sticky purchase bar (appears on scroll)
2. Breadcrumbs: Home / Product
3. Overview section: H2 + hero description + main hero video (no carousel)
4. Media sections
   - Videos row: 3-up grid (first three videos)
   - Screenshots row: horizontally scrollable; 3 visible, scroll for more; lightbox on click
5. About (if description has additional paragraphs)
6. Features list
7. Related Articles: 3-card grid (same typography/label pattern as other sections)
8. FAQs, Permissions, Reviews
9. Related Apps: bottom full-width grid (up to 6)
10. Footer

## Related Apps

- Computed server-side from all products using overlapping `categories` (2 points) and `keywords` (1 point)
- Sorted by score, then name; limited to 6; excludes the current product
- Implemented in `apps/store/app/[slug]/marketplace-page.tsx` (`computeRelatedApps`)

## Structured data (schema.org)

We output the same schema set used on the other lander via `ProductStructuredDataScripts`:

- Product + Offer
- BreadcrumbList
- SoftwareApplication (WebApplication)
- TranslatedResults
- FAQPage (when FAQs present)
- VideoObject (all product + related videos)

Inputs are passed from the marketplace view:

- `posts`: resolved blog posts matching `related_posts` from product JSON
- `images`: `featured_image` + all `screenshots` (absolute URLs)
- `videoEntries`: all primary + related videos (with embed/thumbnail metadata)
  - Base URLs are derived from `siteConfig.site.domain` (fallback to `NEXT_PUBLIC_SITE_URL`) so product URLs are consistent in SSR/CSR.

Server wiring lives in `apps/store/app/[slug]/marketplace-page.tsx` and passes `schemaPosts` and `schemaVideoEntries` so no server-only modules leak into client code.

## Toggling behavior / quick reference

- Use marketplace lander: set `status: pre_release`
- Classic landing: omit `status: pre_release`

## Notes

- Breadcrumbs and section labels use the same typography as other sections via `SECTION_LABEL_CLASS`.
- Screenshot row uses a lightbox; videos open in a new tab from the grid.
- You can adjust limits (e.g., videos per row) or scoring in `marketplace-page.tsx` if needed.
- `MarketplaceProductPageView` is now a thin orchestrator; all derived data, CTA wiring, and sticky-bar state live in `apps/store/components/product/landers/marketplace/useMarketplaceProductPageViewModel.tsx` and `MarketplaceMetadataList.tsx`. Extend those helpers when adding new sections so the component stays declarative.
