# Environment File

We use a single, canonical environment file for local development:

- Repo root: `/.env`

Why only one file?
- Avoids duplicate configuration between multiple files.
- Eliminates confusion about which file wins in different loaders.

Loaders updated to match:
- Runtime/server: `apps/store/lib/load-env.ts` loads only `repo-root/.env` (first-wins semantics; no override).
- Script helpers: `apps/store/scripts/utils/env.ts` load only `repo-root/.env`.
- Next build: `apps/store/next.config.mjs` loads only `repo-root/.env`.

Recommended contents for local dev:

```
STRIPE_SECRET_KEY_TEST=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
STRIPE_ENTITLEMENTS_ENABLED=true
NEXT_PUBLIC_RUNTIME_ENV=development
ACCOUNT_VERIFICATION_EMAIL_DISABLED=true
```

Notes:
- Do not commit `/.env`.
- CI should inject its own environment via the runner (secrets manager or job variables). This file is only for local usage.
- Set `ACCOUNT_VERIFICATION_EMAIL_DISABLED=true` to suppress verification emails (legacy `/account` flow).
