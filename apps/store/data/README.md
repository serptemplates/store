# Product Content Contract

- Every product lander lives in its own YAML file under `data/products/*.yaml`. The filename (minus extension) is automatically used as the URL slug (`/<slug>`).
- The shared schema is defined in `product.schema.json`. When you add new fields to the template, update this schema once so all products inherit the contract.
- Validate your content with `pnpm --filter @apps/store validate:content`. This script iterates every YAML file and prints any schema violations with field-level error details.
- Check marketing coverage with `pnpm --filter @apps/store report:coverage`. The report highlights which product files are missing features, media, FAQs, and other key sections from the shared template.
- Export the full offer catalog to CSV with `pnpm --filter @apps/store export:offers` (output: `docs/offer-catalog.csv`).
- Export domains and primary URLs for each deployed site with `pnpm --filter @apps/store export:domains` (output: `docs/domain-inventory.csv`).
- Hide products from this site by adding their slugs to `data/site.config.json` under `excludeSlugs`.
- Dev server routing: `http://localhost:3000/` redirects to the first product slug. Hit `http://localhost:3000/<slug>` to preview a specific product. Adding a new YAML file makes its page available immediately at that path.
- Optionally, run `pnpm --filter @apps/store typecheck` to ensure TypeScript stays happy after schema or template changes.
