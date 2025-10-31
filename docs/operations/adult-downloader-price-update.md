# Adult Downloader Price Update Checklist

Use this checklist end-to-end for each adult downloader that needs a price change. Run it top to bottom, checking each item as you complete it. Keep product-specific notes (Stripe IDs, URLs, etc.) with the checklist for traceability.

## Preparation
- [ ] Review `AGENTS.md` pre-work requirements (ESLint configuration, lint script, precommit hooks) and confirm the repo still satisfies them.
- [ ] Gather the product name, current price, and any known Stripe product/price IDs before making changes.

## Identify Targets
- [ ] Locate the product file: `rg -l -- "- Adult" apps/store/data/products` and select the JSON entry for this downloader.
- [ ] Scan the file for price references (`pricing.price`, `note`, marketing copy) and record the existing Stripe price/checkout identifiers (`stripe_price_id`, `live_url`, etc.).

## Update Repository Content
- [ ] Edit the product JSON to drop the public price from `$17`/`$17.00` to `$9`, keeping the formatting style used in that file.
- [ ] Update any additional price mentions in the same file (notes, marketing blurbs, CTA copy) so the public story matches the new cost.
- [ ] Search the codebase for other references to the product’s old price or Stripe identifiers and adjust them: `rg "<OLD_STRIPE_PRICE_ID>"` and `rg "\\$17"`.

## Stripe Price Management
- [ ] In Stripe, create a new recurring/one-time price at `$9 USD` for the product (Stripe prices are immutable).
- [ ] Archive or disable the old `$17` price to avoid accidental use.
- [ ] Record the new Stripe price ID and confirm the product’s default price now points to it.

## Wire Stripe Updates Into the Repo
- [ ] Update stored Stripe price IDs or checkout URLs (`stripe_price_id`, `live_url`, payment link IDs, etc.) in the repository to reference the new `$9` price.
- [ ] Re-scan for lingering references to the retired price ID and remove them.

## Validation
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Review the diff to ensure only the intended price and Stripe ID updates are present.

## Functional Verification
- [ ] In staging/non-production, trigger the downloader’s checkout flow and confirm the session charges `$9` and displays the correct amount through confirmation.
- [ ] Monitor logs/console (via Playwright MCP tools if needed) for related errors during the flow.

## Release & Follow-Up
- [ ] Coordinate the merge/deploy following `docs/operations/store-deployment.md`.
- [ ] Watch initial production transactions in Stripe to confirm the new price is live.
- [ ] Update any internal tracking (sheets, dashboards, changelogs) that reference the downloader’s pricing.
