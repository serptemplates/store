# next-mdx-remote 6 Upgrade

## Why this was needed

Vercel blocks deploys that include `next-mdx-remote@5.0.0` because of `CVE-2026-0969`.

The store app uses `next-mdx-remote/rsc` in [`apps/store/app/blog/[slug]/page.tsx`](/Users/devin/repos/projects/store/apps/store/app/blog/[slug]/page.tsx), so the fix is to keep the package on `6.x` or later.

## What changed

- Upgraded `apps/store/package.json` from `next-mdx-remote@^5.0.0` to `^6.0.0`.
- Added a unit test at [`apps/store/tests/unit/content/dependency-security.test.ts`](/Users/devin/repos/projects/store/apps/store/tests/unit/content/dependency-security.test.ts) that fails if `next-mdx-remote` drops below major version `6`.

## Important v6 behavior

`next-mdx-remote` v6 blocks JavaScript expressions in MDX by default.

That is the safer default and is fine for the current store blog flow. The current blog page only passes markdown content plus rehype plugins and does not opt back into JavaScript execution.

If trusted MDX content ever needs inline JavaScript expressions later, that should be an explicit decision. Review the package security notes first and only relax `blockJS` for trusted content sources.

## Verification used for this upgrade

- targeted Vitest regression: `tests/unit/content/dependency-security.test.ts`
- full store unit suite
- `pnpm lint`
- `pnpm typecheck`
- `pnpm validate:products`
- `pnpm --filter @apps/store build`
