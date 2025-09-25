# Shopify Store Migration TODO

## Task 1 – Shopify foundation (Owner)
- [ ] Create a Shopify development store (trial is fine) and install a fast Online Store 2.0 theme (e.g. Dawn).
- [ ] Configure the theme name, baseline navigation, and desired collections/categories (Course Platforms, Video Tools, etc.).
- [ ] Enable custom app access, generate Admin API access token and Storefront access token, and note the store domain.
- [ ] Share credential placeholders securely (domain + tokens) for local development only—do not commit secrets.

## Task 2 – Product sync tooling (Repo work)
- [ ] Add Shopify Admin API client helpers (`lib/shopify-admin.ts`) with typed wrappers for products, metafields, and collections.
- [ ] Implement `scripts/sync-shopify-products.mjs` to:
  - [ ] Read `apps/store/data/products/*.yaml` and convert to Shopify product payloads.
  - [ ] Create/update corresponding Shopify products, variants/pricing, and media assets.
  - [ ] Maintain Shopify collections based on our category mappings.
  - [ ] Upsert metafields/metaobjects for SERP-specific data (slug, testimonials, FAQs, pricing blocks, affiliate settings).
- [ ] Document required environment variables (`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_API_TOKEN`, etc.) in `docs/vercel-envs.md`.

## Task 3 – Metafield & theme wiring (Hybrid)
- [ ] Define metafield definitions (namespace/key/type) for testimonials, FAQs, pricing details, affiliate tracking, and CTA URLs.
- [ ] Provide theme section/snippet code (Liquid/JSON) to render the SERP product layout (hero, pricing card, cross-sells) using those metafields.
- [ ] Import definitions into Shopify (via Admin API or UI) and attach metafield values via the sync script.
- [ ] Apply theme customizations in Shopify’s editor: enable featured collections, search/filter settings, and mobile navigation improvements.

## Task 4 – GHL automation layer (Repo work)
- [ ] Extend checkout persistence to accept `source: "shopify"` and keep order logging unified.
- [ ] Create `/apps/shopify-sync` (or similar) service to host Shopify webhook endpoints.
- [ ] Implement webhook handling for `orders/create` / `orders/paid`:
  - [ ] Verify HMAC signature.
  - [ ] Map Shopify order payload → SERP offer metadata (via metafields/line-item properties).
  - [ ] Reuse `syncOrderWithGhl` to push contacts/opportunities and handle affiliate IDs.
  - [ ] Record outcomes and trigger Ops alerts on failures.
- [ ] Add scripts/tests to simulate webhook payloads for QA.

## Task 5 – End-to-end testing & rollout (Shared)
- [ ] Run the sync script against the dev store (dry-run + apply) and verify products/collections appear correctly.
- [ ] Place test orders (Shopify test mode) to confirm webhooks, database persistence, and GHL sync.
- [ ] Review theme UX on desktop/mobile and tweak navigation, recommendations, and search settings.
- [ ] Prepare production checklist: duplicate theme, switch DNS, monitor orders/alerts, and maintain rollback plan.
