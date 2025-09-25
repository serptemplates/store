# Shopify Store Migration TODO

## Task 1 – Shopify foundation (Owner)
- [ ] Create a Shopify development store (trial is fine) and install a fast Online Store 2.0 theme (e.g. Dawn).
- [ ] Configure the theme name, baseline navigation, and desired collections/categories (Course Platforms, Video Tools, etc.).
- [ ] Enable custom app access, generate Admin API access token and Storefront access token, and note the store domain.
- [ ] Share credential placeholders securely (domain + tokens) for local development only—do not commit secrets.

## Task 2 – Product sync tooling (Repo work)
- [x] Add Shopify Admin API helpers (`lib/shopify-admin.mjs`) with REST + GraphQL wrappers for products, metafields, and collections.
- [x] Implement `scripts/sync-shopify-products.mjs` to:
  - [x] Read `apps/store/data/products/*.yaml` and convert to Shopify payloads (products + variants).
  - [x] Create/update products via Admin REST, keeping variant pricing in sync.
  - [x] Ensure collections exist for category groupings.
  - [x] Sync SERP-specific metafields (slug, testimonials, FAQs, pricing label/note/benefits, GHL config, etc.).
- [x] Document Shopify environment variables and scripts (`docs/vercel-envs.md`, `docs/shopify-theme.md`).

## Task 3 – Metafield & theme wiring (Hybrid)
- [x] Define metafield definitions and provisioning script (`pnpm setup:shopify:metafields`).
- [x] Supply theme section example (`docs/shopify-theme.md`) using the SERP metafields.
- [ ] Import definitions into Shopify (run setup script) and confirm product metafields populated after sync.
- [ ] Apply theme customizations in Shopify editor (add SERP section, configure navigation, featured collections, search/filter behaviour).

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
