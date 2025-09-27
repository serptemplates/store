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

# GHL Tags Configuration
GHL_TAG_CUSTOMER=customer
GHL_TAG_PURCHASER=purchaser
GHL_TAGS_BY_PRODUCT=product-a:tag-a,product-b:tag-b

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/store

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

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