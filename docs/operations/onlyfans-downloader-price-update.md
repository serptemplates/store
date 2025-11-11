# OnlyFans Downloader Price Update (17 → 27 USD)

> **Scope**: Changing the OnlyFans Downloader (slug `onlyfans-downloader`) public price from **$17** to **$27** while keeping compare-at pricing consistent and preventing stale Stripe IDs or feeds.
>
> **Goal**: Update Stripe, all in-repo price references, operational docs, and automated feeds so every surface (storefront UI, checkout API, Google Merchant, partner docs, and regression tests) reflects the new amount without breaking Dub attribution or merchant exports.

---

## 1. Know Every Live Touchpoint

| Surface | Why it matters | Current reference |
| --- | --- | --- |
| Product JSON used at runtime | UI, checkout API, feeds read this canonical document | `apps/store/data/products/onlyfans-downloader.json:71-80` for `pricing.*`, `168-172` for `stripe.price_id` |
| Price manifest | `findPriceEntry()` (`apps/store/lib/products/product-adapter.ts:268-303`) and Google Merchant (`apps/store/lib/google-merchant/merchant-product.ts:1-99`) source amounts from `apps/store/data/prices/manifest.json` |
| Internal checkout route | `/checkout/<slug>` resolves the manifest entry server-side when creating the Stripe session (`apps/store/app/checkout/[slug]/route.ts`) |
| Tests & partner docs | Dub integration docs reference the live Stripe price ID (`docs/architecture/dub-partner-attribution.md`) |
| Ops references | Stripe exports + ops tables surface price IDs (`docs/data/prices.csv:65`, `docs/data/offer-catalog.csv:49`, `docs/offer-catalog.csv:97`) |

Keep this table handy while editing; every row needs to be touched or re-generated.

---

## 2. Prep Checklist

1. Re-read `AGENTS.md` requirements (ESLint, pnpm lint script, Husky hooks) to confirm the repo still satisfies them.
2. Collect credentials:
   - Stripe Dashboard access to `prod_Sv6HHbpO7I9vt0`.
   - `STRIPE_SECRET_KEY` and `STRIPE_SECRET_KEY_TEST` for regenerating the manifest.
   - Google Merchant service-account vars if you plan to push the feed.
3. Snapshot current identifiers (adjust the ID strings whenever you mint a new price):  
  ```bash
  rg -n "price_1SRotl06JrOmKRCmY0T4Yy2P" -n   # current $27 live price
  rg -n "price_1SO0eT06JrOmKRCmURKdH9hA" -n   # retired $9 legacy price (should stay unused)
  ```  
  This gives you a quick checklist of everywhere the live/retired price IDs are referenced before you edit anything.

---

## 3. Create the $27 Stripe Price

1. In Stripe, open **Products → OnlyFans Downloader (`prod_Sv6HHbpO7I9vt0`)**.
2. Create a **new one-time USD price** for **$27.00**. Stripe prices are immutable, so you must mint a new ID (e.g. `price_XXXXXXXXXXXX27`).
3. Disable/Archive the old `$17` price(s) so no one selects them accidentally.
4. Record the new price ID for the repo updates in the next section.

---

## 4. Update the Repository

> Tip: make the edits below in this order so the validation scripts keep passing as you go.

1. **Product JSON** (`apps/store/data/products/onlyfans-downloader.json:71-80,168-172`)
   - Update `pricing.price` to `$27.00`.
   - Decide whether you want a $47 strike-through price. Either:
     - Set `pricing.original_price` to `$47.00`, or
     - Add `compare_at_amount: 4700` to the manifest entry so the UI derives the correct number automatically.
   - Swap `stripe.price_id` to the new Stripe ID and keep `metadata.stripe_product_id` as-is.
   - Sanity-check `pricing.note` / marketing copy for embedded dollar values.

2. **Price manifest** (`apps/store/data/prices/manifest.json`)
   - Replace the entry at `line ~26` (currently `price_1SRotl06JrOmKRCmY0T4Yy2P`) with the new ID you just minted.
   - Set `unit_amount` to `2700` and keep `currency: "usd"`.
   - If you want the storefront to show the strike-through automatically, include `"compare_at_amount": 4700`.
   - Sorting matters; run `pnpm --filter @apps/store validate:products` afterward to re-sort (see Section 5).

3. **Ops CSV exports**
   - `docs/data/prices.csv:65`: update the `Price ID` column to the new ID and the `Amount` column to `27.00`.
   - `docs/data/offer-catalog.csv:49` and `docs/offer-catalog.csv:97`: set the `Price` column to `$27.00` and swap the `price_...` column to the new ID. These files fuel sales/merchant handoffs.

4. **Dub attribution docs**
   - `docs/architecture/dub-partner-attribution.md`: change the example `priceId` and JSON snippet to the new Stripe price. This keeps the documentation accurate for partner engineers.

5. **Housekeeping**
   - Re-run `rg -n "<old_price_id>"` to confirm the old ID is gone everywhere in the repo (code, docs, tests).
   - If you retire the $9 Stripe price (`price_1SO0eT06JrOmKRCmURKdH9hA`), clean up any lingering references the same way.

---

## 5. Regenerate Derived Artifacts

Run these from the repo root so every dependent file stays in sync:

```bash
# Refresh product validation + price manifest
pnpm --filter @apps/store validate:products

# Export the latest CSV offer catalog (updates docs/offer-catalog*.csv)
pnpm --filter @apps/store export:offers

# Optional: refresh Google Merchant feed for this SKU
pnpm run merchant:export -- --slug=onlyfans-downloader
# or, to push directly (requires service-account env vars):
pnpm run merchant:upload -- --slug=onlyfans-downloader --dry-run
```

- `validate:products` reorders JSON deterministically and (when `STRIPE_SECRET_KEY` is set) fetches fresh amounts for `apps/store/data/prices/manifest.json`.
- `export:offers` rewrites both `docs/data/offer-catalog.csv` and the public `docs/offer-catalog.csv`.
- The merchant scripts call `buildMerchantProduct()` (`apps/store/lib/google-merchant/merchant-product.ts:1-200`), which reads `findPriceEntry()`. Without an updated manifest entry the feed will still say $17.

---

## 6. Verification & QA

1. **Automated gates (repo root):**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test:unit
   ```
   These commands already run `check:products`, `validate:content`, MDX validation, and the Vitest suite required by `AGENTS.md`.

2. **Runtime sanity checks:**
   - `pnpm --filter @apps/store dev`  
     Visit `http://localhost:3000/onlyfans-downloader` and confirm:
       - Hero pricing now shows `$27` with the correct compare-at.
       - `GET /api/checkout/products/onlyfans-downloader` returns `price: 27` and `priceDisplay: "$27.00"`.
   - Run the Dub regression helper to confirm the checkout session uses the new price:  
     ```bash
     node scripts/test-dub-local.js
     ```
     Follow the console steps; the Network panel should show `priceId: "<new_id>"`.

3. **Playwright smoke (captures console/network logs per agent requirements):**
   ```bash
   pnpm --filter @apps/store test:smoke --project="Desktop Chrome"
   ```
   Review the generated report under `apps/store/playwright-report/` for console errors.

4. **Stripe dashboard spot-check:** create a test-mode checkout session (use the internal `/checkout` flow) and confirm the amount displayed is $27 before approving the change.

---

## 7. Deployment & Monitoring

1. Review the diff to ensure only price-related files changed.
2. Merge + deploy following `docs/operations/store-deployment.md`.
3. After deploy, watch:
   - Stripe live payments for `price_<new_id>` to ensure revenue matches $27.
   - Google Merchant diagnostics to confirm the refreshed feed ingested the new price.
   - Affiliate dashboards (Dub) to make sure attribution payloads still include the correct `priceId`.
4. Archive the old price IDs in your internal tracker so there’s a single source of truth for $27 going forward.

Following this checklist keeps every consumer of the OnlyFans Downloader price—storefront UI, checkout, docs, and third-party feeds—perfectly aligned with the new $27 offer while avoiding side effects on the Dub/Stripe integration.
