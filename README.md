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

## Site-Specific Blog Content

- Shared posts live in `apps/satellite/content/blog`, but each site can override them by dropping Markdown/MDX into `sites/<slug>/content/blog`.
- The loader prefers site folders first; slugs in the site directory win over shared posts with the same filename.
- To limit a shared post to specific sites, add `sites: ["downloadvimeo.com", "getlooma.com"]` in its front matter.
- When developing or exporting a site, set `SITE_SLUG=<slug>` (the deploy script does this automatically) so the build picks the correct content.

## Stripe Price Sync

- CI automatically runs `pnpm sync:stripe-prices` on pushes to `main` and commits price updates when Stripe amounts change.
- To refresh prices manually, ensure `STRIPE_SECRET_KEY` (or `STRIPE_SECRET_KEY_TEST`) is available in your environment or `.env`, then run:

```bash
pnpm sync:stripe-prices
```

This updates each product YAML with formatted pricing pulled from Stripe.

## Stripe Checkout

For the checkout to work properly, you need to have these
   environment variables set in your .env.local file:
  - STRIPE_SECRET_KEY - Your Stripe secret key
  - STRIPE_WEBHOOK_SECRET - For handling Stripe webhooks
  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY - Your Stripe publishable key