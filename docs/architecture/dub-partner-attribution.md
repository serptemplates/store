# Dub Partner Program Attribution Implementation

## Overview

This document describes the implementation of Dub Partner Program attribution for affiliate purchases through the store. The solution enables proper tracking and commission attribution for affiliates who drive traffic using Dub short links (serp.cc).

## Problem Statement

The Dub Stripe integration requires specific metadata fields (`dubCustomerExternalId` and `dubClickId`) to be present in Stripe checkout session metadata for attribution to work. However, Stripe Payment Links have static metadata that cannot be dynamically set per-session, making it impossible to pass the required Dub tracking data.

## Solution Architecture

### High-Level Flow

1. **Affiliate shares Dub link**: `serp.cc/xxx` → `apps.serp.co/product?dub_id=xyz`
2. **DubAnalytics sets cookie**: `dub_id` cookie stored on `.serp.co` domain
3. **User clicks buy button**: Instead of linking directly to Payment Link, we intercept the click
4. **Create programmatic session**: Call `/api/checkout/session` with Dub metadata from cookie
5. **Redirect to Stripe**: User completes checkout with proper attribution metadata
6. **Dub Stripe app tracks**: Webhook receives session with `dubCustomerExternalId`, attributes sale to affiliate

### Technical Components

#### 1. Client-Side Tracking (`@dub/analytics`)

**File**: `/apps/store/components/analytics/DubAnalytics.tsx`

- Initializes Dub analytics SDK
- Automatically sets `dub_id` cookie when query parameter is present
- Cookie domain: `.serp.co` (works across subdomains)
- Tracked query params: `via`, `dub_id`

#### 2. Checkout Session API

**File**: `/apps/store/app/api/checkout/session/route.ts`

- Accepts `dubCustomerExternalId` and `dubClickId` parameters
- Passes them to Stripe checkout session metadata
- Also sets `clientReferenceId` for additional tracking

**Request Schema**:
```typescript
{
  priceId: string,
  quantity?: number,
  mode?: "payment" | "subscription",
  successUrl?: string,
  cancelUrl?: string,
  customerEmail?: string,
  clientReferenceId?: string,
  dubCustomerExternalId?: string,  // Required for Dub attribution
  dubClickId?: string,              // Required for Dub attribution
  metadata?: Record<string, string>
}
```

#### 3. Dub Checkout Utility

**File**: `/apps/store/lib/checkout/create-session-with-dub.ts`

- Reads `dub_id` cookie from browser
- Normalizes the value (ensures `dub_id_` prefix)
- Calls checkout session API with proper Dub metadata
- Returns checkout session URL for redirect

**Key Function**:
```typescript
async function createSessionWithDub(options: CreateSessionWithDubOptions): Promise<string | null>
```

#### 4. React Hook for Buy Button

**File**: `/apps/store/lib/checkout/use-dub-checkout.ts`

- React hook that encapsulates the buy button logic
- Checks if product has `stripe.price_id` available
- Intercepts click events when price ID is present
- Creates programmatic checkout session with Dub metadata
- Falls back to Payment Link if anything fails

**Usage**:
```typescript
const dubCheckout = useDubCheckout({
  product,
  fallbackUrl: resolvedCta.href,
  onCheckoutStart: () => { /* analytics */ },
  onCheckoutError: (error) => { /* error handling */ }
})

// Returns: { handleBuyClick, isCreatingSession, hasPriceId }
```

#### 5. Integration in Product Page

**File**: `/apps/store/components/product/landers/default/ClientHomeView.tsx`

**Changes**:
1. Import `useDubCheckout` hook
2. Initialize hook with product data and fallback URL
3. Modify CTA handlers to use `dubCheckout.handleBuyClick()` when price ID is available
4. Set CTA href to `"#"` when intercepting (prevents default navigation)
5. Remove old useEffect that attempted to modify Payment Link URLs

**Before**:
```typescript
// Attempted to append dub_id to Payment Link URL (doesn't work)
const handlePrimaryCtaClick = useCallback(() => {
  handleCtaClick("pricing")
}, [handleCtaClick])
```

**After**:
```typescript
// Intercepts click to create programmatic session with Dub metadata
const dubCheckout = useDubCheckout({ product, fallbackUrl: resolvedCta.href })

const handlePrimaryCtaClick = useCallback((event) => {
  if (dubCheckout.hasPriceId) {
    dubCheckout.handleBuyClick(event)  // Creates session with Dub data
  } else {
    handleCtaClick("pricing")  // Fallback to normal flow
  }
}, [dubCheckout, handleCtaClick])
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Affiliate shares Dub link                                │
│    serp.cc/xxx → apps.serp.co/product?dub_id=abc123         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. DubAnalytics component loads                             │
│    - Reads dub_id query parameter                           │
│    - Sets cookie: dub_id=abc123 (domain: .serp.co)          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. User clicks "Get it Now" buy button                      │
│    - useDubCheckout hook intercepts click                   │
│    - Reads dub_id cookie: "abc123"                          │
│    - Normalizes: "dub_id_abc123"                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. POST /api/checkout/session                               │
│    {                                                         │
│      priceId: "price_1SRotl06JrOmKRCmY0T4Yy2P",            │
│      dubCustomerExternalId: "dub_id_abc123",                │
│      dubClickId: "dub_id_abc123",                           │
│      clientReferenceId: "dub_id_abc123"                     │
│    }                                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Stripe creates checkout session                          │
│    - Metadata includes dubCustomerExternalId                │
│    - Returns session URL                                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Redirect user to Stripe checkout                         │
│    window.location.href = session.url                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. User completes purchase                                  │
│    - Stripe webhook fires: checkout.session.completed       │
│    - Event includes metadata.dubCustomerExternalId          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Dub Stripe app receives webhook                          │
│    - Finds dubCustomerExternalId in metadata                │
│    - Attributes sale to affiliate "abc123"                  │
│    - Commission tracked for payout                          │
└─────────────────────────────────────────────────────────────┘
```

## Comparison with Existing GHL Affiliate Tracking

This implementation follows the exact same pattern as the existing GHL affiliate tracking:

| Aspect | GHL Affiliates | Dub Partner Program |
|--------|---------------|---------------------|
| **Cookie Name** | `affiliateId` | `dub_id` |
| **Query Params** | `aff`, `affiliate`, `affiliateId`, `am_id` | `dub_id`, `via` |
| **Cookie Domain** | `.serp.co` | `.serp.co` |
| **Storage Location** | Checkout session metadata | Checkout session metadata |
| **Field Names** | `metadata.affiliateId` | `metadata.dubCustomerExternalId`, `metadata.dubClickId` |
| **Integration** | GHL custom fields via sync | Dub Stripe app webhook |
| **Implementation** | Cookie-based, manual sync | Cookie-based, automatic via Stripe integration |

## Product Data Requirements

For this solution to work, products must have `stripe.price_id` field in their JSON:

```json
{
  "stripe": {
    "price_id": "price_1SRotl06JrOmKRCmY0T4Yy2P",
    "metadata": {
      "stripe_product_id": "prod_Sv6HHbpO7I9vt0"
    }
  },
  "payment_link": {
    "live_url": "https://buy.stripe.com/...",
    "test_url": "https://buy.stripe.com/test_..."
  }
}
```

**Graceful Degradation**: If `stripe.price_id` is not present, the buy button falls back to the Payment Link (no attribution, but purchase still works).

## Testing

### Manual Test Flow

1. **Set up affiliate link**:
   ```
   https://serp.cc/test → https://apps.serp.co/onlyfans-downloader?dub_id=test_affiliate_123
   ```

2. **Visit the link**: Verify `dub_id` cookie is set
   ```javascript
   // In browser console
   document.cookie.split(';').find(c => c.includes('dub_id'))
   // Should return: "dub_id=test_affiliate_123"
   ```

3. **Click buy button**: Should redirect to Stripe checkout (not Payment Link URL)

4. **Complete test purchase**: Use Stripe test card `4242 4242 4242 4242`

5. **Check webhook logs**: Verify Dub Stripe app received the attribution
   ```
   ✓ dubCustomerExternalId: "dub_id_test_affiliate_123" present
   ✓ No "skipping" error in Dub logs
   ✓ Sale attributed to affiliate
   ```

### Automated Tests

Add to test suite:
- Unit test for `createSessionWithDub()` cookie reading logic
- Unit test for `useDubCheckout()` click interception
- Integration test for full checkout flow with Dub cookie
- E2E test with Playwright to verify end-to-end attribution

## Monitoring

### Success Metrics

- Checkout sessions created via API (with `dubCustomerExternalId`) vs Payment Links
- Dub webhook attribution success rate
- Fallback to Payment Links rate (when price_id missing)

### Error Scenarios

1. **No dub_id cookie**: Session created without Dub metadata (no attribution)
2. **API call fails**: Fallback to Payment Link (no attribution)
3. **No price_id in product**: Direct link to Payment Link (expected behavior)
4. **Session creation timeout**: Fallback to Payment Link after 5s

### Logging

Key events to monitor:
```typescript
// Success
console.log("Dub checkout session created", { dubId, sessionId })

// Fallback
console.log("Falling back to Payment Link", { reason, productSlug })

// Error
console.error("Dub checkout error", { error, dubId, priceId })
```

## Deployment Checklist

- [x] Create checkout session utility
- [x] Create React hook for buy button interception
- [x] Update ClientHomeView to use Dub checkout
- [x] Remove old Payment Link URL modification code
- [x] Run lint checks
- [x] Run type checks
- [ ] Run unit tests
- [ ] Test with real Dub affiliate link
- [ ] Verify Dub dashboard shows attributed sales
- [ ] Monitor error rates for first 24 hours
- [ ] Update product JSON files to include `stripe.price_id` where missing

## Rollback Plan

If attribution issues occur:

1. **Immediate**: Revert ClientHomeView changes (restore Payment Link direct links)
2. **Investigation**: Check Dub webhook logs for errors
3. **Fix**: Update metadata field names or cookie reading logic as needed
4. **Redeploy**: Test thoroughly before re-enabling

## Future Enhancements

1. **Server-side cookie reading**: Move cookie logic to API route for better reliability
2. **Analytics dashboard**: Track Dub attribution success rates
3. **A/B testing**: Compare Dub vs non-Dub conversion rates
4. **Multi-currency support**: Ensure Dub tracking works with all currencies
5. **Subscription products**: Extend to support recurring payments

## References

- Dub Partner Program: https://dub.co/partners
- Dub Stripe Integration: https://dub.co/docs/integrations/stripe
- @dub/analytics SDK: https://www.npmjs.com/package/@dub/analytics
- Existing GHL affiliate tracking: `/apps/store/lib/ghl-client/sync.ts` (line 457)
- Stripe Checkout Session API: https://stripe.com/docs/api/checkout/sessions/create
