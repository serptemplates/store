# Repo Cleanup Inventory (Issue #194 follow-up)

This document captures the code paths and assets that appear to be unused after the Stripe Payment Link migration. The goal is to provide a checkpoint before we delete anything, so other teams can flag hidden dependencies.

## 1. UI & React Components

| Status | Path | Notes |
| --- | --- | --- |
| [x] | `apps/store/components/ConversionAudit.tsx` | Deleted (legacy marketing hero). |
| [x] | `apps/store/components/FAQ.tsx` | Deleted (standalone FAQ section). |
| [x] | `apps/store/components/Hero.tsx` | Deleted (old conversion hero). |
| [x] | `apps/store/components/SocialProof.tsx` | Deleted (superseded by UI package component). |
| [x] | `apps/store/components/waitlist-form.tsx` | Deleted (replaced by `GhlWaitlistModal`). |
| [x] | `apps/store/components/analytics/analytics-provider.tsx` | Deleted (unused wrapper). |
| [x] | `apps/store/components/analytics/gtm.tsx` (`useAnalytics`) | Deleted; only `DelayedGTM` remains. |
| [x] | `apps/store/components/shop/product-grid.tsx` | Deleted (Shop experiment remnant). |

## 2. Alternative Product Layouts

| Status | Path | Notes |
| --- | --- | --- |
| [x] | `apps/store/app/[slug]/apple-style-hero.tsx` | Deleted (unused concept layout). |
| [x] | `apps/store/app/[slug]/flowbite-style-hero.tsx` | Deleted. |
| [x] | `apps/store/app/[slug]/nike-style-hero.tsx` | Deleted. |

These can either be archived to a design playground or removed to avoid confusion.

## 3. Feature Flags / Config

| Status | Path | Notes |
| --- | --- | --- |
| [ ] | `apps/store/lib/feature-flags.ts` | `SHOP_ENABLED` constant is hard-coded `false` and unused. Safe to delete once Shop experiment is officially killed. |

## 4. Tests & QA Suites

| Status | Path | Notes |
| --- | --- | --- |
| [x] | `apps/store/tests/account-dashboard.spec.ts` | Deleted (redundant console-smoke test). |
| [x] | `apps/store/tests/videos-page.spec.ts` | Deleted (same reason). |
| [ ] | `apps/store/tests/manual/**` | Manual scripts remain—confirm ownership before pruning. |

If we want automated smoke coverage for `/account` or `/videos`, we should add lighter-weight tests later (e.g., integration snapshots) before removing those routes.

## 5. Design System (packages/ui)

`packages/ui/src/index.ts` re-exports a large surface area of components that the store no longer consumes (per `ts-prune`). Before deleting them, coordinate with any other workspaces:

- [ ] Audit which packages use these exports.
- [ ] Split the entry point or mark unused components as deprecated to avoid breaking downstream apps.

## 6. Scripts & Tooling

| Status | Path | Notes |
| --- | --- | --- |
| [ ] | `apps/store/scripts/update-video-metadata.ts` + `lib/products/video-scraper/*` | Only needed if we re-enable the video library. Decide whether to keep or move to archival docs. |
| [ ] | `apps/store/schema/education-qa-schema.ts` & friends | Schema utilities referenced only by internal validation scripts; confirm if they’re still part of SEO workflows. |
| [x] | `apps/store/demo-checkout-fix.js` | Deleted; checkout duplication demo lives in postmortem docs. |
| [x] | `apps/store/data/ghl-payment-links.json` | Deleted; Payment Link metadata now sourced from product YAML + Stripe scripts. |

## 7. Remote Asset Dependencies

Most product YAML files still embed screenshots/hero images from the suspended `serpapps` GitHub organisation. Only the Beeg and YouPorn product pages have been migrated to local `/media/products/<slug>/` assets so far.

- Affected slugs (active as of this branch): `123movies`, `123rf`, `adobe-stock`, `ai-voice-cloner-app`, `alamy`, `alpha-porno`, `amazon-video`, `bilibili`, `bongacams`, `camsoda`, `canva`, `chaturbate`, `circle`, `coursera`, `dailymotion`, `depositphotos`, `deviantart`, `dreamstime`, `eporner`, `erome`, `erothots`, `facebook`, `flickr`, `freepik`, `getty-images`, `giphy`, `gohighlevel`, `gokollab`, `hulu`, `instagram`, `internet-archive`, `istock`, `kajabi`, `khan-academy`, `kick-clip`, `learndash`, `learnworlds`, `linkedin-learning`, `livejasmin`, `loom`, `m3u8`, `moodle`, `myfreecams`, `netflix`, `nicovideo`, `onlyfans`, `patreon`, `pdf`, `pexels`, `pinterest`, `pixabay`, `podia`, `pornhub`, `rawpixel`, `redgifs`, `redtube`, `scribd`, `shutterstock`, `skillshare`, `skool`, `snapchat`, `soundcloud`, `soundgasm`, `spankbang`, `sprout`, `stocksy`, `stockvault`, `storyblocks`, `stream`, `stripchat`, `teachable`, `telegram`, `terabox`, `thinkific`, `thumbnail`, `tiktok`, `tnaflix`, `tubi`, `tumblr`, `twitch`, `twitter`, `udemy`, `unsplash`, `vectorstock`, `vimeo`, `vk`, `whop`, `wistia`, `xhamster`, `xnxx`, `xvideos`, `youtube`.
- Next step: either mirror those repositories into the `serpdownloaders` org and update URLs, or export/optimize the images into `apps/store/public/media/products/<slug>/`.
- Capture whichever approach we take in `plan-194.md` (Phase 7) before removing the legacy hosts.

## Next Steps

1. Share this list with Product/Marketing to confirm nothing is in stealth use.
2. Create follow-up tickets (one per section) to delete or refactor the items once approved.
3. Update `plan-194.md` (Phase 7) as items are cleared, and note any historical docs that should mention the removals.
