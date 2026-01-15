# Environment Files and Variables

## Single source of truth

Local development uses a single env file:

- Repo root: `/.env`

Loaders:

- Runtime/server: `apps/store/lib/load-env.ts`
- Script helpers: `apps/store/scripts/utils/env.ts`
- Next build: `apps/store/next.config.mjs`

`apps/store/lib/env-validation.ts` is the canonical reference for runtime validation and logging.

## Core runtime variables

Required:

- `NEXT_PUBLIC_SITE_URL` (full site URL, e.g. `https://apps.serp.co`)
<<<<<<< HEAD
=======
  - Used for canonical product URLs and SEO metadata when `site.config.json` does not override the domain.
>>>>>>> 34aba1f4 (clean up dry up store repo)

Recommended:

- `ACCOUNT_SESSION_SECRET` (enables `/account` sessions)
- `DATABASE_URL` (Postgres for checkout_sessions/orders)

## Stripe

Required for checkout:

- `STRIPE_SECRET_KEY_TEST` or `STRIPE_SECRET_KEY` (test)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST` or `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET_TEST` or `STRIPE_WEBHOOK_SECRET`

Live equivalents:

- `STRIPE_SECRET_KEY_LIVE` (or `STRIPE_SECRET_KEY` with `sk_live_*`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE`
- `STRIPE_WEBHOOK_SECRET_LIVE`

Optional:

- `NEXT_PUBLIC_STRIPE_MODE` or `STRIPE_MODE` (force `test` or `live`)
- `STRIPE_ENTITLEMENTS_ENABLED` (enables Stripe customer entitlements)
- `NEXT_PUBLIC_STORE_BASE_URL` (optional override for store checkout base URL)
- `STRIPE_BILLING_PORTAL_CONFIGURATION_ID_LIVE` (live customer portal configuration for `/account`)
- `STRIPE_BILLING_PORTAL_CONFIGURATION_ID_TEST` (test customer portal configuration for `/account`)
- `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` (fallback portal configuration when mode-specific values are unset)
<<<<<<< HEAD
=======
- `STORE_BASE_URL` (server-only fallback for the store base URL when `NEXT_PUBLIC_STORE_BASE_URL` is not set)
>>>>>>> 34aba1f4 (clean up dry up store repo)

## serp-auth entitlements

Required to grant and read entitlements:

- `INTERNAL_ENTITLEMENTS_TOKEN` (preferred) or `SERP_AUTH_INTERNAL_SECRET`
- `SERP_AUTH_BASE_URL` (defaults to `https://auth.serp.co`)

Optional (email update via D1):

- `SERP_AUTH_CF_ACCOUNT_ID`
- `SERP_AUTH_CF_D1_DATABASE_ID`
- `SERP_AUTH_CF_API_TOKEN`

## GoHighLevel

Required:

- `GHL_LOCATION_ID`
- `GHL_PAT_LOCATION` (or `GHL_API_TOKEN` / `GHL_API_KEY`)

Optional:

- `GHL_API_BASE_URL` (defaults to `https://services.leadconnectorhq.com`)
- `GHL_API_VERSION` (defaults to `2021-07-28`)
- `GHL_API_V1_BASE_URL` (override for `/v1` contact endpoints)
- `GHL_CUSTOM_FIELD_PURCHASE_METADATA`
- `GHL_CUSTOM_FIELD_LICENSE_KEYS_V2`
- `GHL_PAYMENT_WEBHOOK_SECRET`
- `GHL_AFFILIATE_FIELD_ID`

## Email delivery

Account verification emails use SMTP or Resend:

- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- Resend: `RESEND_API_KEY`
- Sender: `ACCOUNT_EMAIL_SENDER` (optional `ACCOUNT_EMAIL_REPLY_TO`)

## Monitoring and alerts

- `MONITORING_TOKEN` (protects monitoring endpoints)
- `CHECKOUT_MONITOR_STALE_SESSION_MINUTES`
- `CHECKOUT_MONITOR_STALE_WEBHOOK_MINUTES`
- `CHECKOUT_MONITOR_WEBHOOK_LOOKBACK_HOURS`
- `CHECKOUT_MONITOR_MIN_ORDERS_LOOKBACK_HOURS`
- `CHECKOUT_MONITOR_MIN_ORDERS`
- `OPS_ALERT_WEBHOOK_URL` (fallback to `SLACK_ALERT_WEBHOOK_URL`)

## Analytics and attribution

- `NEXT_PUBLIC_GTM_ID`
- `NEXT_PUBLIC_DUB_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST`
- `POSTHOG_API_KEY` / `POSTHOG_API_HOST`
- `NEXT_PUBLIC_POSTHOG_DISABLED`

## Legacy license service (optional)

- `LICENSE_ADMIN_URL` (or `LICENSE_SERVICE_ADMIN_URL`)
- `LICENSE_KEY_ADMIN_API_KEY` (or `LICENSE_ADMIN_API_KEY`)
- `LICENSE_SERVICE_URL`
- `LICENSE_SERVICE_TOKEN` (or `LICENSE_SERVICE_API_KEY`)

## Merchant Center scripts

Used by `scripts/google-merchant/*.ts`:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (or `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` / `GOOGLE_SERVICE_ACCOUNT_KEY_FILE`)
- `GOOGLE_MERCHANT_ACCOUNT_ID`
- `GOOGLE_MERCHANT_COUNTRIES` (default `US`)
- `GOOGLE_MERCHANT_LANGUAGE` (default `en`)
- `GOOGLE_MERCHANT_SITE_URL` (default `https://apps.serp.co`)
- `GOOGLE_MERCHANT_APPS_URL` (default `https://apps.serp.co`)
