# Runbook: Update a Product Price (Stripe + Storefront)

> **Purpose**: Keep every surface (Stripe, product data, manifests, feeds, docs, and automated tests) aligned whenever a SKU price changes. This flow applies to any product that bills through Stripe in the SERP Store monorepo.

---

## 1. Know the Surfaces You Must Touch

| Surface | Why it matters | Where to look |
| --- | --- | --- |
| Product JSON (`apps/store/data/products/<slug>.json`) | Storefront UI, checkout API, feeds, and tests read this canonical file. | `pricing.*` and `stripe.*` blocks |
| Price manifest (`apps/store/data/prices/manifest.json`) | `findPriceEntry()` powers checkout, and Google Merchant exports read this manifest. | Entry keyed by the product slug |
| Docs/CSV exports (any shared spreadsheets or SOPs) | Shared references for ops + integrations (e.g., Dub). | Search for the old `price_***` ID |
| Automation + feeds (`merchant:export`, Dub samples) | Keep attribution payloads and feeds in sync with the new amount. | Scripts under `apps/store` + `docs/architecture` |

Before editing, run:

```bash
rg -n "price_<old_live_price_id>"
rg -n "price_<old_test_price_id>"
```

Use the output as a checklist to ensure the old IDs disappear everywhere.

---

## 2. Prep Checklist

1. Re-read `AGENTS.md` (lint/typecheck/test expectations, Husky hooks) so you know the verification gates you must run before shipping.
2. Gather credentials:
   - Stripe dashboard access + API keys (`STRIPE_SECRET_KEY[_TEST]`, publishable keys, webhook secrets) for the account that owns the SKU.
   - Google Merchant credentials if you plan to push the feed after updating prices.
3. Identify the product slug (`<slug>`) and confirm its JSON + manifest entries exist.
4. Snapshot the current price IDs + cents so you can validate diffs later.

---

## 3. Create the New Stripe Price

1. In Stripe, open **Products → <Your Product>**.
2. Create the required price(s) based on billing mode (Stripe prices are immutable):
   - **One-time checkout (`payment.mode: "payment"`)**: create a new **one-time USD price** for the desired amount.
   - **Subscription checkout (`payment.mode: "subscription"`)**: create a **recurring monthly price** for the ongoing amount, plus a **one-time setup fee price** if the first payment should be higher.
3. Create matching **test-mode** price(s) for each of the above if you want `/checkout` test flows to reflect the same values.
4. Archive or disable any obsolete prices inside Stripe to prevent accidental use.
5. Copy the new live + test `price_***` IDs—you will pass the recurring IDs to the CLI and record any setup-fee IDs for metadata.

---

## 4. Update the Repository

Use the provided helper so product JSON, manifests, and CSV exports stay in sync:

```bash
pnpm --filter @apps/store update:price -- \
  --slug <slug> \
  --price-cents <live_price_in_cents> \
  --price-id <new_live_price_id> \
  --test-price-id <new_test_price_id>
```

- `--compare-cents <strike_through_amount>` is optional if you need a “compare at” price.
- The script:
  - Updates `apps/store/data/products/<slug>.json` (`pricing.*`, `payment.stripe`, and `stripe` blocks).
  - Rewrites `apps/store/data/prices/manifest.json` with the new amount and IDs.
  - Runs `pnpm --filter @apps/store convert:products -- --slug <slug>` and `pnpm --filter @apps/store validate:products` to normalize + validate JSON.
- For subscription products with an upfront setup fee, also set:
  - `payment.stripe.metadata.setup_fee_price_id`
  - `payment.stripe.metadata.setup_fee_test_price_id`
  The helper does not touch these fields—edit the product JSON and re-run `pnpm --filter @apps/store convert:products -- --slug <slug>` afterward.
- Afterward, update any docs/CSVs that reference the price ID (e.g., partner runbooks, `docs/architecture/dub-partner-attribution.md`).
- Run `rg -n "price_<old_live_price_id>"` again to confirm nothing stale remains.

---

## 5. Refresh Derived Artifacts

- Merchant feed (optional but recommended after customer-facing changes):

  ```bash
  pnpm run merchant:export -- --slug=<slug>
  # or push live (requires service-account env vars)
  pnpm run merchant:upload -- --slug=<slug> --dry-run
  ```

- If affiliate/Dub samples reference the price ID, update `docs/architecture/dub-partner-attribution.md` or any related SOPs.

---

## 6. Verification & QA

1. **Automated gates (repo root)** – Required by `AGENTS.md` unless the user explicitly defers:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test:unit
   pnpm --filter @apps/store test:smoke --project="Desktop Chrome"   # captures console/network logs
   pnpm --filter @apps/store validate:products                       # if not already run
   ```

2. **Runtime sanity checks**
   - `pnpm --filter @apps/store dev`, then open `http://localhost:3000/<slug>`.
   - Confirm the hero shows the new amount and `GET /api/checkout/products/<slug>` returns `price: <new_amount>` with the expected `price_id`.
   - For subscription + setup fee SKUs, confirm Stripe Checkout shows two line items (monthly price + one-time setup fee) and the total matches the intended first payment.
   - Use `node scripts/test-dub-local.js` (or your Dub helper) to ensure attribution payloads report the new `priceId`.
3. **Stripe dashboard** – Create a test-mode checkout session and verify the amount + price ID before merging.

---

## 7. Deployment & Monitoring

1. Review the diff: only price-related files/docs should change.
2. Merge + deploy following `docs/operations/store-deployment.md`.
3. Post-deploy monitoring:
   - Stripe live payments show `price_<new_live_price_id>` with the correct amount.
   - Google Merchant diagnostics show the refreshed feed.
   - Affiliate dashboards/Dub webhooks reference the new price ID.
4. Archive the retired price IDs in your internal tracker so future updates know which identifiers are active.

Following this runbook keeps every consumer of a SKU’s price perfectly aligned across Stripe, the storefront, feeds, and documentation.
