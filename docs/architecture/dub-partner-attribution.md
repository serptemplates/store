# Dub Partner Program Attribution Implementation

## Overview

This document describes the implementation of Dub Partner Program attribution for affiliate purchases through the store. The solution enables proper tracking and commission attribution for affiliates who drive traffic using Dub short links (serp.cc).

## Problem Statement

The Dub Stripe integration requires specific metadata fields (`dubCustomerExternalId` and `dubClickId`) to be present in Stripe checkout session metadata for attribution to work. However, Stripe Payment Links have static metadata that cannot be dynamically set per-session, making it impossible to pass the required Dub tracking data.

## Solution Architecture

### High-Level Flow

1. **Affiliate shares Dub link**: `serp.cc/xxx` → `apps.serp.co/product?dub_id=xyz`
2. **DubAnalytics sets cookie**: `dub_id` cookie stored on `.serp.co` domain
3. **User clicks buy button**: CTA always navigates to `/checkout/<slug>`
4. **Server route creates session**: `app/checkout/[slug]/route.ts` reads the `dub_id` cookie and attaches Dub metadata while creating the Stripe Checkout Session
5. **Redirect to Stripe**: User completes checkout with proper attribution metadata
6. **Dub Stripe app tracks**: Webhook receives session with `dubCustomerExternalId`, attributes sale to affiliate

### Technical Components

#### 1. Client-Side Tracking (`@dub/analytics`)

**File**: `/apps/store/components/analytics/DubAnalytics.tsx`

- Initializes Dub analytics SDK
- Automatically sets `dub_id` cookie when query parameter is present
- Cookie domain: `.serp.co` (works across subdomains)
- Tracked query params: `via`, `dub_id`

#### 2. Server-Side Checkout Session Creation

**File**: `/apps/store/app/checkout/[slug]/route.ts`

- Resolves the product/offer config from JSON.
- Reads the `dub_id` cookie from the request and normalizes it (`dub_id_...`).
- Adds Dub identifiers (`dubCustomerExternalId`, `dubClickId`, `client_reference_id`) directly to the Stripe Checkout Session metadata.
- Redirects the user to `session.url`.

Because this happens inside the Next.js route handler, there is no client-side fetch or API proxy to maintain, and metadata is attached for every checkout regardless of how the CTA was triggered.

#### 3. Integration in Product Page

**File**: `/apps/store/components/product/landers/default/ClientHomeView.tsx`

- `useProductCheckoutCta` handles analytics + waitlist behaviour and normalizes CTA URLs so they always land on `/checkout/<slug>` (or the configured waitlist URL).
- Once the browser navigates to `/checkout/<slug>`, the server route handles the Dub metadata injection and Stripe session creation.

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
│    - useProductCheckoutCta logs analytics                   │
│    - Browser navigates to /checkout/onlyfans-downloader     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. GET /checkout/onlyfans-downloader                        │
│    - Route reads dub_id cookie: "abc123"                    │
│    - Normalizes: "dub_id_abc123"                            │
│    - Creates Stripe Checkout Session w/ Dub metadata        │
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
│    Next.js issues 302 → https://checkout.stripe.com/...     │
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

For this solution to work, products must have `stripe.price_id` and an internal checkout CTA in their JSON:

```json
{
  "stripe": {
    "price_id": "price_1SRotl06JrOmKRCmY0T4Yy2P",
    "metadata": {
      "stripe_product_id": "prod_Sv6HHbpO7I9vt0"
    }
  },
  "pricing": {
    "cta_href": "https://apps.serp.co/checkout/onlyfans-downloader"
  }
}
```

**Graceful Degradation**: If `stripe.price_id` is missing, schema validation surfaces the error for live products. Draft or pre-release entries can still link to waitlists or docs, but `/checkout/<slug>` is never rendered so there is no partial attribution state.

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
- Unit test for the `/checkout/[slug]` route handler that stubs a request with `dub_id` and asserts the Stripe payload includes `dubCustomerExternalId`, `dubClickId`, and `client_reference_id`.
- Unit/component test for `useProductCheckoutCta` to ensure CTA clicks normalize internal URLs and invoke `handleCtaClick` without rewriting to external hosts.
- E2E test with Playwright to verify: CTA navigates to `/checkout/<slug>`, Fast Refresh logs show the 302 to Stripe, and Stripe test sessions include the Dub metadata.

## Monitoring

### Success Metrics

- Percentage of `/checkout/<slug>` responses that include Dub metadata (should mirror the percentage of CTA clicks that originated from a Dub link).
- Dub webhook attribution success rate.
- Stripe webhook error rate for `checkout.session.completed`.

### Error Scenarios

1. **No dub_id cookie**: Session created without Dub metadata (expected; no attribution).
2. **No price_id on product**: Route returns 404 and schema validation should have failed earlier.
3. **Stripe API error**: Route returns 500 and CTA displays an error toast; investigate Stripe logs.

### Logging

Key events to monitor from `/checkout/[slug]`:
```typescript
logger.info("checkout.session.create", {
  slug,
  dubId,
  stripeMode,
  sessionId,
})

logger.error("checkout.session.create_failed", {
  slug,
  dubId,
  error: error instanceof Error ? error.message : String(error),
})
```

## Deployment Checklist

- [x] Normalize all product CTAs to `/checkout/<slug>` and enforce via schema.
- [x] Update `/checkout/[slug]/route.ts` to read `dub_id` and attach metadata.
- [x] Update client CTAs (ClientHomeView + sticky bar) to rely on internal navigation only.
- [x] Run lint checks
- [x] Run type checks
- [ ] Run unit tests
- [ ] Test with real Dub affiliate link
- [ ] Verify Dub dashboard shows attributed sales
- [ ] Monitor webhook error rates for first 24 hours
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
