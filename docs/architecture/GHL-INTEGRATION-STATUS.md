# GHL Integration Status & Verification Guide

## Current Implementation Status ✅

### 1. **Payment Processing Integration** ✅
- **Stripe Checkout**: Fully implemented at `/api/checkout/session`
- **Stripe Webhook**: Handles events at `/api/stripe/webhook`
- **Affiliate Tracking**: Captures `affiliateId` in checkout metadata
- **Order Persistence**: Saves to PostgreSQL via `upsertOrder()`

### 2. **GHL Sync Implementation** ✅
- **Contact Creation/Update**: Implemented in `lib/ghl-client.ts`
- **Purchase Events**: Synced via `syncOrderWithGhl()`
- **Retry Logic**: 3 attempts with exponential backoff
- **Error Handling**: Logs failures and sends ops alerts

### 3. **Data Flow** ✅
```
User Purchase → Stripe Checkout → Webhook → Database → GHL API
                                     ↓
                              Affiliate Attribution
```

## Environment Variables Required

Add these to your `.env.local`:

```env
# GHL Configuration
GHL_API_BASE_URL=https://services.leadconnectorhq.com
GHL_LOCATION_ID=your_location_id_here
GHL_PAT_LOCATION=your_personal_access_token_here
GHL_API_VERSION=2021-07-28

# GHL Custom Field IDs (for order data)
GHL_CUSTOM_FIELD_ORDER_VALUE=custom_field_id_for_order_value
GHL_CUSTOM_FIELD_PRODUCT_NAME=custom_field_id_for_product_name
GHL_CUSTOM_FIELD_AFFILIATE_ID=custom_field_id_for_affiliate
GHL_CUSTOM_FIELD_ORDER_ID=custom_field_id_for_order_id

# Optional overrides (auto-detected when unset)
GHL_CUSTOM_FIELD_PURCHASE_METADATA=custom_field_id_for_purchase_metadata
GHL_CUSTOM_FIELD_LICENSE_KEYS_V2=custom_field_id_for_license_payload

# GHL Tags Configuration
GHL_TAG_CUSTOMER=customer
GHL_TAG_PURCHASER=purchaser
GHL_TAGS_BY_PRODUCT=product-a:tag-a,product-b:tag-b

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/store

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_SECRET_KEY_TEST=sk_test_xxx           # optional: explicit test key override
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxx         # optional: explicit test webhook secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_INTEGRATION_OFFER_ID=loom-video-downloader  # optional: product slug for integration spec
```

> The automated Stripe->GHL integration spec reads the `_TEST` variables when present and falls back to the base keys. Set the optional entries above if you keep separate live/test credentials in the same environment file.

## Verification Steps

### 1. Verify Database Connection
```bash
# Check if database is accessible
psql $DATABASE_URL -c "SELECT NOW();"

# Check checkout_sessions table exists
psql $DATABASE_URL -c "\dt checkout_sessions;"
psql $DATABASE_URL -c "\dt orders;"
```

### 2. Verify GHL API Connection
```bash
# Test GHL API access
curl -X GET "https://services.leadconnectorhq.com/locations/${GHL_LOCATION_ID}" \
  -H "Authorization: Bearer ${GHL_PAT_LOCATION}" \
  -H "Version: 2021-07-28"
```

### 3. Test Purchase Flow
```bash
# 1. Create test checkout session
curl -X POST http://localhost:3000/api/checkout/session \
  -H "Content-Type: application/json" \
  -d '{
    "offerId": "demo-ecommerce-product",
    "customer": {
      "email": "test@example.com",
      "name": "Test User"
    },
    "affiliateId": "aff123",
    "metadata": {
      "utm_source": "test",
      "utm_campaign": "verification"
    }
  }'

# 2. Complete purchase in Stripe test mode
# 3. Check webhook logs
tail -f logs/webhook.log

# 4. Verify in GHL
# - Contact created with email
# - Tags applied
# - Custom fields populated
```

### 4. Verify Affiliate Attribution
```sql
-- Check if affiliate data is captured
SELECT
  stripe_session_id,
  metadata->>'affiliateId' as affiliate_id,
  customer_email,
  created_at
FROM checkout_sessions
WHERE metadata->>'affiliateId' IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### 5. Monitor GHL Sync Status
```sql
-- Check successful GHL syncs
SELECT
  stripe_session_id,
  metadata->>'ghlSyncedAt' as synced_at,
  metadata->>'ghlContactId' as contact_id,
  status
FROM checkout_sessions
WHERE metadata->>'ghlSyncedAt' IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Check failed syncs
SELECT
  stripe_session_id,
  customer_email,
  status,
  metadata
FROM checkout_sessions
WHERE status = 'completed'
  AND metadata->>'ghlSyncedAt' IS NULL
ORDER BY created_at DESC;
```

### 6. Run Automated Stripe -> GHL Integration Test

```bash
pnpm --filter @apps/store exec vitest run tests/integration/stripe-ghl-flow.test.ts
```

**Prerequisites**
- `STRIPE_SECRET_KEY_TEST` (or `STRIPE_SECRET_KEY`) and matching `STRIPE_WEBHOOK_SECRET_TEST`
- `DATABASE_URL` pointing at a writable Postgres instance
- `GHL_LOCATION_ID` and `GHL_PAT_LOCATION` with API access
- Optional: `STRIPE_INTEGRATION_OFFER_ID` to target a non-default offer slug

> The test automatically loads `.env.local` / `.env` from both the repo root and `apps/store`, so you can keep your secrets in those files rather than exporting them manually before each run.

The spec provisions a checkout session via the public API, replays a signed `checkout.session.completed` webhook, and asserts that `checkout_sessions.metadata` picks up `ghlSyncedAt`/`ghlContactId` while the matching order persists in `orders`.

### 7. Run Automated PayPal -> GHL Integration Test

```bash
pnpm --filter @apps/store exec vitest run tests/integration/paypal-ghl-flow.test.ts
```

**Prerequisites**
- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` configured for a sandbox app
- `DATABASE_URL` pointing at a writable Postgres instance
- `GHL_LOCATION_ID` and `GHL_PAT_LOCATION` with API access
- Optional: `STRIPE_INTEGRATION_OFFER_ID` to target a non-default offer slug

> Like the Stripe spec, the PayPal test auto-loads `.env.local` / `.env` from the repo root and `apps/store` so you can keep secrets in those files.

The spec pre-seeds a PayPal checkout session, stubs the capture call, hits `/api/paypal/capture-order`, and verifies that both the order record and `checkout_sessions` row mirror our Stripe flow (including `ghlSyncedAt`, `ghlContactId`, and PayPal metadata).

## Testing Checklist

### Payment Processing
- [ ] Stripe test mode purchase completes
- [ ] Webhook receives checkout.session.completed event
- [ ] Order saved to database
- [ ] Payment intent ID captured

### GHL Integration
- [ ] Contact created/updated in GHL
- [ ] Tags applied correctly
- [ ] Custom fields populated:
  - [ ] Order value
  - [ ] Product name
  - [ ] Affiliate ID
  - [ ] Order ID
  - [ ] Purchase metadata JSON (`contact.purchase_metadata`)
  - [ ] License keys payload (`contact.license_keys_v2`)

**Purchase Metadata JSON**
- Generated automatically for both Stripe and PayPal providers.
- Includes provider, offer, product page URL, checkout URL (if applicable), customer info, payment totals, affiliate ID, and license snapshot.
- Stored as pretty-printed JSON in `contact.purchase_metadata`.

**License Keys Payload**
- Contains the active license key, license ID, action (created/updated), entitlements array, and tier.
- Stored as JSON in `contact.license_keys_v2`.

> ℹ️ Field IDs are discovered from GoHighLevel at runtime. As long as your location has custom fields with the exact keys `contact.purchase_metadata` and `contact.license_keys_v2`, no additional configuration is required. The `GHL_CUSTOM_FIELD_*` environment variables remain available if you prefer to override the detected IDs or point to alternate fields per environment.
- [ ] Automation triggered (if configured)

### Affiliate Tracking
- [ ] Affiliate ID captured from URL params
- [ ] Stored in checkout metadata
- [ ] Passed to GHL custom field
- [ ] Available for commission tracking

### Email Handling
- [ ] No duplicate contacts created
- [ ] Existing contacts updated (not recreated)
- [ ] Email validation working

### Automated Checks
- [ ] `tests/integration/stripe-ghl-flow.test.ts` passes (`pnpm --filter @apps/store exec vitest run tests/integration/stripe-ghl-flow.test.ts`)
- [ ] `tests/integration/paypal-ghl-flow.test.ts` passes (`pnpm --filter @apps/store exec vitest run tests/integration/paypal-ghl-flow.test.ts`)

## Monitoring & Alerts

### Key Metrics to Monitor
1. **Webhook Success Rate**: Should be >99%
2. **GHL Sync Success Rate**: Should be >95%
3. **Database Write Success**: Should be 100%
4. **Average Sync Time**: Should be <2 seconds

### Alert Conditions
- GHL sync fails 3 times for same order
- Database connection lost
- Webhook signature verification fails
- Missing required metadata (email, offerId)

## Common Issues & Solutions

### Issue: GHL sync failing with 401
**Solution**: Check GHL_PAT_LOCATION token is valid and has correct permissions

### Issue: Duplicate contacts in GHL
**Solution**: GHL handles deduplication by email automatically

### Issue: Affiliate ID not tracking
**Solution**: Ensure URL has `?aff=ID` or `?affiliateId=ID` parameter

### Issue: Webhook not receiving events
**Solution**:
1. Check Stripe webhook endpoint URL
2. Verify webhook secret matches
3. Check firewall/proxy settings

## Regression Baseline – 2025-10-02 Manual Proof

**Goal**: Verify a Stripe test checkout persists to Postgres and syncs to GoHighLevel without automation.

### Environment
- `.env.local` includes working `STRIPE_SECRET_KEY`, latest `STRIPE_WEBHOOK_SECRET_TEST`, `DATABASE_URL`, and required `GHL_*` keys.
- Dev server started with `pnpm --filter @apps/store dev` (watch for `env.validation_success`).
- Stripe CLI relay running:

```bash
stripe listen \
  --events checkout.session.completed,payment_intent.succeeded \
  --forward-to localhost:3000/api/stripe/webhook
```

### Manual Flow
1. Visit `http://localhost:3000`, open the product page (`/loom-video-downloader`), click **Buy**, and complete Stripe checkout in test mode using card `4242 4242 4242 4242` and email `test@serp.co`.
2. Observe dev-server logs confirming a successful sync:
   - `POST /api/stripe/webhook 200`
   - `ghl.contact_upserted` with `offerId: "loom-video-downloader"`, `email: "test@serp.co"`, and `contactId: "WDWSTD9nFxUNRYo8MryL"`
   - Opportunity creation intentionally skipped (`missing_pipeline_or_stage`) and no workflow errors (workflow IDs removed).
3. Confirm database write:

```bash
psql "$DATABASE_URL" -c "
  SELECT offer_id,
         amount_total,
         metadata->>'ghlSyncedAt' AS ghl_synced_at
    FROM orders
   WHERE customer_email = 'test@serp.co'
   ORDER BY created_at DESC
   LIMIT 1;
"
```

Expected result: row present with `offer_id = loom-video-downloader`, `amount_total = 1700` (in cents), and a non-null `ghl_synced_at` timestamp.

### Snapshot Notes
- Contact `test@serp.co` exists in GHL with tag `purchase-loom-video-downloader`.
- Product YAML has pipeline/stage IDs removed; workflows omitted to prevent 404s.
- Repeat the above steps after any change to Stripe config, database schema, or GHL credentials to preserve this baseline.

## Next Steps

1. **Set up monitoring dashboard** for real-time metrics
2. **Configure GHL automations** for post-purchase flows
3. **Implement commission tracking** for affiliates
4. **Add customer portal** for order history
5. **Set up abandoned cart recovery** webhooks

## Support Contacts

- **Stripe Support**: dashboard.stripe.com/support
- **GHL Support**: support.gohighlevel.com
- **Database Admin**: [Your DBA contact]
- **On-Call Engineer**: [Your on-call rotation]
