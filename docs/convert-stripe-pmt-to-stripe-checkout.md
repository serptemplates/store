Phase 1 — Per‑product migration (keeps Payment Link metadata; changes just the CTA)
  For each product you want to move to the API checkout:

  1. Edit the product JSON

  - Set the CTA to the internal checkout route:
      - pricing.cta_href: "https://apps.serp.co/checkout/{slug}"
  - Keep payment_link as‑is (used by tooling and historical metadata; not used for checkout anymore)
  - Ensure success/cancel URLs are sane:
      - success_url: "https://apps.serp.co/checkout/success"
      - cancel_url: "https://apps.serp.co/checkout?product={slug}"
  - Optionally, add entitlements (granted on purchase if STRIPE_ENTITLEMENTS_ENABLED=true):
      - stripe.metadata.licenseEntitlements: ["circle-downloader"] or a bundle key you prefer

  2. Normalize the file so pre‑push hooks pass (this only reorders fields)

  - Preview (no write):
      - pnpm --filter @apps/store exec tsx apps/store/scripts/convert-products.ts --check --slug circle-
        downloader
  - Apply (write):
      - pnpm --filter @apps/store convert:products -- --slug circle-downloader

  3. Verify locally (optional, but quick)

  - Lint/typechecks/tests:
      - pnpm -w lint
      - pnpm -w typecheck
      - pnpm -w run test:unit
  - Open the product page and click the CTA:
      - It should navigate to /checkout/{slug} and 302 to checkout.stripe.com/c/pay/cs_live_… (not
        buy.stripe.com)

  Phase 2 — Batch migration (when you’re ready)

  - For many products, repeat the same content change:
      - Set pricing.cta_href to https://apps.serp.co/checkout/{slug}
      - Remove buy_button_destination if it points to old links (or set it to the same /checkout/{slug})
      - Run the normalizer across all:
          - pnpm --filter @apps/store convert:products
  - Sanity‑check a handful of live pages after deploy.

  Phase 3 — Rollout and monitoring

  - Deploy and test a purchase for one migrated product:
      - Confirm in Stripe: payment_link is null, consent_collection.terms_of_service=required,
        customer_creation=always, metadata.product_slug + Dub fields present.
      - Confirm GHL: contact retains prior tags (we now merge existing + new purchase tag).
  - Enable entitlements when ready (optional):
      - STRIPE_ENTITLEMENTS_ENABLED=true in /.env, redeploy
      - After a new purchase, Stripe Customers → Features should show the entitlement (or use the CLI to
        list grants).

  Notes and assurances

  - You don’t have to delete Payment Links. The product JSON keeps them for scripts and metadata; the
    app uses the internal route for checkout.
  - The success page does not require {CHECKOUT_SESSION_ID} in content anymore; the server adds it when
    talking to Stripe. I already made the normalizer strip the placeholder automatically.
  - Dub attribution is cookie‑based (via serp.cc → apps.serp.co). The /checkout route reads the dub_id
    cookie and mirrors it to metadata and client_reference_id.