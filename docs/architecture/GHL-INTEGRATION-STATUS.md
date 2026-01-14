# GHL Integration Status

## Summary

The store syncs purchase context into GoHighLevel after Stripe checkout. The Stripe webhook (`checkout.session.completed`) calls `syncOrderWithGhl` through `apps/store/lib/payments/stripe-webhook/helpers/ghl-sync.ts`, which retries failures and records results in checkout session metadata.

## Key runtime behavior

- Contact lookup and updates are handled in `apps/store/lib/ghl-client`.
- Purchase payloads are sent as JSON blobs:
  - `contact.purchase_metadata` for purchase metadata (most recent purchase stays at the top level; previous entries move to `previousPurchases[]`).
  - `contact.license_keys_v2` for legacy license details (if license service is enabled).
- Retries: up to 3 attempts with exponential backoff (`helpers/ghl-sync.ts`).
- Missing GHL credentials result in a no-op rather than a hard failure.

## Environment variables

Required for GHL sync:

- `GHL_LOCATION_ID`
- One of `GHL_PAT_LOCATION`, `GHL_API_TOKEN`, or `GHL_API_KEY`

Optional configuration:

- `GHL_API_BASE_URL` (defaults to `https://services.leadconnectorhq.com`)
- `GHL_API_VERSION` (defaults to `2021-07-28`)
- `GHL_API_V1_BASE_URL` (override for `/v1` contact endpoints)
- `GHL_CUSTOM_FIELD_PURCHASE_METADATA` (override field id)
- `GHL_CUSTOM_FIELD_LICENSE_KEYS_V2` (override field id)
- `GHL_PAYMENT_WEBHOOK_SECRET` (validates inbound GHL payment webhooks)
- `GHL_AFFILIATE_FIELD_ID` (custom field id for affiliate attribution)

## Verification

Local/manual checks:

```bash
pnpm --filter @apps/store exec tsx scripts/manual-tests/run.ts ghl-direct
pnpm --filter @apps/store exec tsx scripts/manual-tests/run.ts ghl-api-direct
pnpm --filter @apps/store exec tsx scripts/manual-tests/run.ts exact-request
```

Optional preview-only check (skips unless env is present):

```bash
pnpm --filter @apps/store test:ghl-preview
```

Integration coverage:

- `apps/store/tests/integration/api/stripe-webhook.test.ts`
- `apps/store/tests/integration/api/ghl-payment-webhook.test.ts`

## Troubleshooting

- 401/403 errors usually mean the PAT/token is missing or expired.
- If custom fields are missing, ensure your GHL location defines `contact.purchase_metadata` and `contact.license_keys_v2` (or set explicit overrides).
