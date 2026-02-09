# Playwright Browser Install Notes

If `pnpm --filter @apps/store test:smoke` fails with:

`browserType.launch: Executable doesn't exist at .../ms-playwright/.../headless_shell`

It means Playwright browsers are not downloaded on this machine yet.

This repo only depends on Playwright inside `apps/store`, so install browsers with:

```bash
pnpm --filter @apps/store exec playwright install
```

After that, rerun:

```bash
pnpm --filter @apps/store test:smoke
```

