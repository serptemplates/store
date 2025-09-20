# README

- https://getlooma.com
- https://downloadvimeo.com
- https://skooldownloader.com
- https://wistiadownloader.com
- https://udemyvideodownloader.com
- https://tiktokdownloaderapp.com
- https://orangepornvideos.net


## Adding a New Site

- Create `sites/<domain>/` with a Next.js app structure.
- Set `package.json` name to `@apps/<domain>` and choose a dev port.
- Update `next.config.mjs`:
  - `output: 'export'`
  - `transpilePackages: ['@repo/ui','@repo/templates']`
- Update `tailwind.config.ts` content globs to include:
  - `../../packages/ui/src/**/*.{ts,tsx}`
- Implement `app/page.tsx` using `HomeTemplate`:
  - `platform` and `exampleUrl` props
  - Pass site UI: `Navbar, Footer, Button, Card, CardHeader, CardTitle, CardContent, Badge` (Input no longer used in Hero)
- Add `site.config.ts` with site metadata (and GTM if used).
- Create deploy workflow targeting the destination repo and GitHub Pages `gh-pages` branch with `CNAME`.
- GitHub Pages: set source to `gh-pages`, configure custom domain, enable HTTPS.
- DNS: point apex via A records or `www` via CNAME to GitHub Pages.

## Stripe Price Sync

- CI automatically runs `pnpm sync:stripe-prices` on pushes to `main` and commits price updates when Stripe amounts change.
- To refresh prices manually, ensure `STRIPE_SECRET_KEY` (or `STRIPE_SECRET_KEY_TEST`) is available in your environment or `.env`, then run:

```bash
pnpm sync:stripe-prices
```

This updates each product YAML with formatted pricing pulled from Stripe.

