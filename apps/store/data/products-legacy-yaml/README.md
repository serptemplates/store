# Legacy YAML Archive

- This directory holds the canonical backups of the former product `.yaml` files.
- Runtime loaders and scripts now consume `../products/*.json`; nothing in production reads from this directory.
- The conversion CLI (`pnpm --filter @apps/store convert:products`) defaults to this archive when regenerating JSON. Keep files unchanged unless you are intentionally restoring a snapshot.
