# Marketplace Lander (Product Page)

This document describes the new marketplace-style product lander, how to enable it per product, and what content it renders. Use this when you want a product page with a clean overview, a main hero video, compact media rows, and related content at the bottom.

## Enable per product

Products live in `apps/store/data/products/<slug>.yaml`. Set one of the following to activate the marketplace lander:

- `layout_type: "marketplace"` – forces the marketplace lander for this product
- or `status: "pre_release"` – also uses the marketplace lander automatically

Other layout options:
- `layout_type: "landing"` (default) – uses the classic landing template

Routing logic: `apps/store/app/[slug]/page.tsx` chooses the layout at request time.

## Content sources (YAML)

- Main hero video: first URL in `product_videos` (falls back to `related_videos` where needed for rows)
- Screenshots: `screenshots` entries (URLs); also uses `featured_image` as a fallback
- Related posts: `related_posts` – array of blog slugs; order is preserved
- Features: `features` – rendered in the Features section
- Pricing/CTA: `pricing` – label, price, and CTA label/URL
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

- `posts`: resolved blog posts matching `related_posts` from product YAML
- `images`: `featured_image` + all `screenshots` (absolute URLs)
- `videoEntries`: all primary + related videos (with embed/thumbnail metadata)

Server wiring lives in `apps/store/app/[slug]/marketplace-page.tsx` and passes `schemaPosts` and `schemaVideoEntries` so no server-only modules leak into client code.

## Toggling behavior / quick reference

- Use marketplace lander: add `layout_type: marketplace` (or set `status: pre_release`)
- Classic landing: omit `layout_type` or set `layout_type: landing`
- Legacy hybrid ecommerce: remove `layout_type: ecommerce` (layout retired)

## Notes

- Breadcrumbs and section labels use the same typography as other sections via `SECTION_LABEL_CLASS`.
- Screenshot row uses a lightbox; videos open in a new tab from the grid.
- You can adjust limits (e.g., videos per row) or scoring in `marketplace-page.tsx` if needed.
