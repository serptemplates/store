# Account Checkout Fix - Technical Documentation

## Problem Summary

The account page was not displaying newly purchased products and license keys were not being generated correctly. This was caused by a regression in how license metadata was being stored in orders.

## Root Cause Analysis

### Issue 1: NULL Payment Intent ID Breaking Updates

**Background:**
- The `orders` table has a UNIQUE constraint on `stripe_payment_intent_id`
- The `upsertOrder` function uses `ON CONFLICT (stripe_payment_intent_id) DO UPDATE` 
- In PostgreSQL, **NULL values are never considered equal in UNIQUE constraints**

**The Problem:**
1. When a checkout session completes, `handleCheckoutSessionCompleted` is called
2. First, an order is inserted with all details (line 175-189 of webhook/route.ts)
3. Then, a license is created via `createLicenseForOrder` (line 218-236)
4. Finally, a second `upsertOrder` call tries to update the order with license metadata (line 240-250)

**The Bug:**
- The second `upsertOrder` call (line 240-250) only passed `stripePaymentIntentId` and license metadata
- If `stripe_payment_intent_id` was NULL when the first order was inserted, the `ON CONFLICT` clause wouldn't match
- This caused PostgreSQL to INSERT a new order with NULL values for everything except the license metadata
- Result: Two orders in the database:
  - Order 1: Complete order info, no license
  - Order 2: Only license info, missing customer email and other details
- The account page queries by customer email, so it would only show Order 1 (without licenses)

### Issue 2: Insufficient Condition Checking

The original code checked:
```typescript
if (licenseResult && paymentIntentId) {
  // update order
}
```

This had two problems:
1. Didn't verify that `licenseResult.licenseKey` actually exists
2. Required `paymentIntentId` to be non-null, but provided no fallback

## Solution Implemented

### 1. New `updateOrderMetadata` Function

Created a dedicated function in `checkout/store.ts` that:
- Accepts lookup keys: `stripePaymentIntentId` and/or `stripeSessionId`
- Tries payment intent ID first (more specific)
- Falls back to session ID if payment intent doesn't match
- Returns boolean indicating success/failure

```typescript
export async function updateOrderMetadata(
  lookupKey: { stripePaymentIntentId?: string | null; stripeSessionId?: string | null },
  metadata: Record<string, unknown>
): Promise<boolean> {
  // Try payment intent ID first
  if (lookupKey.stripePaymentIntentId) {
    const result = await query`
      UPDATE orders
      SET metadata = COALESCE(orders.metadata, '{}'::jsonb) || ${metadataJson}::jsonb,
          updated_at = NOW()
      WHERE stripe_payment_intent_id = ${lookupKey.stripePaymentIntentId}
      RETURNING id;
    `;
    if (result?.rows?.length) {
      return true;
    }
  }

  // Fall back to session ID
  if (lookupKey.stripeSessionId) {
    const result = await query`
      UPDATE orders
      SET metadata = COALESCE(orders.metadata, '{}'::jsonb) || ${metadataJson}::jsonb,
          updated_at = NOW()
      WHERE stripe_session_id = ${lookupKey.stripeSessionId}
      RETURNING id;
    `;
    return Boolean(result?.rows?.length);
  }

  return false;
}
```

### 2. Updated Webhook Handler

Modified `webhook/route.ts` to:
- Check `licenseResult?.licenseKey` instead of `licenseResult && paymentIntentId`
- Use new `updateOrderMetadata` with both payment intent and session ID
- Log a warning if the update fails

```typescript
if (licenseResult?.licenseKey) {
  const now = new Date().toISOString();
  const licenseMetadataUpdate = {
    license: {
      action: licenseResult.action ?? null,
      licenseId: licenseResult.licenseId ?? null,
      licenseKey: licenseResult.licenseKey ?? null,
      updatedAt: now,
    },
  };

  const updated = await updateOrderMetadata(
    {
      stripePaymentIntentId: paymentIntentId,
      stripeSessionId: session.id,
    },
    licenseMetadataUpdate
  );

  if (!updated) {
    logger.warn("license_service.metadata_update_failed", {
      provider: "stripe",
      id: eventId ?? session.id,
      paymentIntentId,
      sessionId: session.id,
    });
  }
}
```

## Why This Works

### Scenario 1: Payment Intent Available
- First lookup by `stripe_payment_intent_id` succeeds
- Order metadata is updated immediately
- Falls back not needed

### Scenario 2: Payment Intent NULL or Not Yet Available
- First lookup by `stripe_payment_intent_id` fails (returns no rows)
- Automatically falls back to `stripe_session_id`
- Session ID is ALWAYS available in `handleCheckoutSessionCompleted`
- Order is successfully updated via session ID

### Scenario 3: License Creation Fails
- If `licenseResult` is null or `licenseResult.licenseKey` is null
- Update is skipped entirely (no attempt to write empty data)
- No spurious database writes

## Testing

Created comprehensive unit tests in `checkout-store-metadata-update.test.ts`:
- ✅ Returns false when database not ready
- ✅ Updates by payment intent ID when available
- ✅ Falls back to session ID when payment intent doesn't match
- ✅ Uses only session ID when payment intent is null
- ✅ Returns false when no lookup keys provided
- ✅ Returns false when no orders match
- ✅ Merges metadata correctly with existing order metadata

## Migration Notes

**No database migration required** - this is purely a code fix that works with the existing schema.

## Verification Steps

To verify the fix works:

1. Create a test order with NULL payment intent ID
2. Verify license metadata is stored correctly
3. Check account page shows the license key
4. Monitor logs for `license_service.metadata_update_failed` warnings

## Related Files

- `apps/store/lib/checkout/store.ts` - Added `updateOrderMetadata` function
- `apps/store/app/api/stripe/webhook/route.ts` - Updated to use new function
- `apps/store/__tests__/checkout-store-metadata-update.test.ts` - Comprehensive tests

## Future Improvements

Consider these enhancements:
1. Add UNIQUE constraint on `stripe_session_id` to prevent duplicate orders
2. Add composite index on `(customer_email, created_at DESC)` for faster account queries
3. Add database-level constraint to ensure either payment_intent_id or session_id is present
