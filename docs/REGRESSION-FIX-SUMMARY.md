# Account Checkout Regression - Fix Summary

## 🎯 Problem Statement

The account page (`/account`) was broken:
1. **Newly purchased products not showing up** on the account page
2. **License keys not being generated or displayed** to customers

This was identified as a regression from a working state (commit 7aba5402).

## 🔍 Root Cause

The issue was caused by a subtle SQL bug in how license metadata was being stored after purchase:

### The SQL NULL Equality Problem

In PostgreSQL (and most SQL databases), **NULL values are never considered equal to each other** in UNIQUE constraints and comparisons. This caused a critical bug:

1. When a Stripe checkout session completes, `stripe_payment_intent_id` may be NULL initially
2. The order is inserted with `stripe_payment_intent_id = NULL`
3. When the license is created, code tries to update the order using:
   ```sql
   INSERT INTO orders (...)
   VALUES (...)
   ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET ...
   ```
4. But `ON CONFLICT (stripe_payment_intent_id)` when the value is NULL **doesn't match any existing row**
5. PostgreSQL inserts a **NEW order** instead of updating the existing one
6. Result: Two orders exist - one with customer data (no license), one with license data (no customer info)
7. The account page queries by customer email, so it only shows the order **without the license**

### The Code Problem

The webhook handler in `webhook/route.ts` had insufficient fallback logic:

```typescript
// OLD CODE (broken)
if (licenseResult && paymentIntentId) {  // Requires paymentIntentId to be non-null
  await upsertOrder({
    stripePaymentIntentId: paymentIntentId,  // Could be NULL!
    metadata: { license: { ... } },
    // Missing: No stripeSessionId provided as fallback
  });
}
```

## ✅ Solution

### 1. New `updateOrderMetadata` Function

Created a dedicated function in `lib/checkout-store.ts` that intelligently handles the lookup:

```typescript
export async function updateOrderMetadata(
  lookupKey: { 
    stripePaymentIntentId?: string | null; 
    stripeSessionId?: string | null 
  },
  metadata: Record<string, unknown>
): Promise<boolean>
```

**Key features:**
- ✅ Tries `stripe_payment_intent_id` first (more specific, better for most cases)
- ✅ Falls back to `stripe_session_id` if payment intent doesn't match (handles NULL case)
- ✅ Returns boolean to indicate success/failure
- ✅ Properly merges metadata using JSONB merge operator

### 2. Updated Webhook Handler

Modified `app/api/stripe/webhook/route.ts`:

```typescript
// NEW CODE (fixed)
if (licenseResult?.licenseKey) {  // Verify key exists
  const updated = await updateOrderMetadata(
    {
      stripePaymentIntentId: paymentIntentId,  // Try first
      stripeSessionId: session.id,              // Fallback (always available)
    },
    { license: { ... } }
  );

  if (!updated) {
    logger.warn("license_service.metadata_update_failed", { ... });
  }
}
```

**Key improvements:**
- ✅ Checks `licenseResult?.licenseKey` instead of just `licenseResult && paymentIntentId`
- ✅ Provides both payment intent ID AND session ID
- ✅ Session ID is ALWAYS available in checkout.session.completed events
- ✅ Logs warning if update fails for debugging

## 📊 Changes Summary

| File | Lines Added | Lines Removed | Purpose |
|------|-------------|---------------|---------|
| `lib/checkout-store.ts` | +43 | 0 | New `updateOrderMetadata` function |
| `app/api/stripe/webhook/route.ts` | +26 | -11 | Use new function with proper fallback |
| `__tests__/checkout-store-metadata-update.test.ts` | +153 | 0 | Comprehensive unit tests |
| `ACCOUNT-CHECKOUT-FIX.md` | +180 | 0 | Technical documentation |
| `demo-checkout-fix.js` | +170 | 0 | Interactive demonstration |
| **TOTAL** | **572** | **11** | **Minimal, surgical fix** |

## 🧪 Testing

### Unit Tests (7 tests, all passing ✅)

1. ✅ Returns false when database not ready
2. ✅ Updates by payment intent ID when available
3. ✅ Falls back to session ID when payment intent doesn't match
4. ✅ Uses only session ID when payment intent is null
5. ✅ Returns false when no lookup keys provided
6. ✅ Returns false when no orders match
7. ✅ Merges metadata correctly with existing order metadata

### Demo Script

Run `node apps/store/demo-checkout-fix.js` to see a side-by-side comparison:

```
OLD CODE:
  - Created 2 orders (one with data, one with license)
  - Customer sees order WITHOUT license
  - Account page broken ✗

NEW CODE:
  - Properly updates the existing order
  - Customer sees order WITH license
  - Account page works correctly ✓
```

## 🎯 Impact

### Before Fix
- ❌ Customers couldn't see license keys after purchase
- ❌ Account page showed incomplete order information
- ❌ Database accumulated duplicate/incomplete orders
- ❌ Customer support burden increased

### After Fix
- ✅ License keys appear immediately on account page
- ✅ Single, complete order per purchase
- ✅ Works with or without payment intent ID
- ✅ Automatic fallback mechanism
- ✅ Better logging for debugging

## 🚀 Deployment

### Prerequisites
- No database migration required
- No environment variable changes needed
- Backward compatible with existing orders

### Testing Steps
1. Deploy to staging
2. Create test purchase with Stripe
3. Verify webhook receives event
4. Check logs for successful metadata update
5. Verify account page shows license key
6. Monitor for `license_service.metadata_update_failed` warnings

### Rollback Plan
If issues occur, the old behavior can be restored by reverting the two main files:
- `lib/checkout-store.ts`
- `app/api/stripe/webhook/route.ts`

## 🎓 Lessons Learned

1. **SQL NULL behavior is tricky** - NULL != NULL in SQL, which breaks ON CONFLICT clauses
2. **Always provide fallback identifiers** - Multiple lookup keys prevent edge cases
3. **Test edge cases** - NULL values, missing fields, and timing issues
4. **Log important events** - Warning logs help identify production issues
5. **Keep fixes minimal** - Small, focused changes are easier to review and deploy

## 📚 Related Documentation

- [Technical Documentation](./apps/store/ACCOUNT-CHECKOUT-FIX.md) - Deep dive into the fix
- [Demo Script](./apps/store/demo-checkout-fix.js) - Interactive demonstration
- [Unit Tests](./apps/store/__tests__/checkout-store-metadata-update.test.ts) - Test coverage

## 🔗 References

- Issue: Account checkout regression
- Previous working commit: `7aba5402b66c4e5d3f40f4dfa89a54544009eb28`
- Fix commits: `e71f0dd`, `203d792`, `dc5b157`
