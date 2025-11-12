# Code Reference: Where Optional Items Are Implemented

## Quick Reference Map

### 🎯 Main Checkout Handler
**File**: `apps/store/app/checkout/[slug]/route.ts`

| Line Range | Code | Purpose |
|-----------|------|---------|
| 10-18 | Type definitions | Define `CheckoutOptionalItem` and `CheckoutSessionCreateParamsWithOptionalItems` |
| 40-210 | `GET()` function | Main async handler for checkout route |
| 117 | `optionalItems: CheckoutOptionalItem[] = []` | Initialize optional items array |
| 118 | `const optionalBundlePriceId = process.env.STRIPE_OPTIONAL_BUNDLE_PRICE_ID` | **← Read env var here** |
| 119-141 | `if (optionalBundlePriceId) { ... }` | Resolve price and add to array |
| 121-127 | `resolvePriceForEnvironment()` call | Handles test/live price sync |
| 129-137 | `optionalItems.push()` | Add SERP Blocks to optional items |
| 139-145 | Error handling | Gracefully handle price resolution failures |
| 147-167 | Session params building | Create Stripe session parameters |
| 166-167 | `if (optionalItems.length > 0) { params.optional_items = optionalItems }` | **← Inject optional items into Stripe session** |
| 195-197 | `stripe.checkout.sessions.create(params)` | **← Send to Stripe API** |

---

### 📊 Webhook Processing
**File**: `apps/store/lib/payments/stripe-webhook/events/checkout-session-completed.ts`

| Line Range | Code | Purpose |
|-----------|------|---------|
| 1-20 | Imports | Import Stripe types and utilities |
| 98-154 | `collectLineItemTagData()` | **← Fetches ALL line items (main + optional)** |
| 115 | `stripe.checkout.sessions.listLineItems()` | Query for all items in session |
| 119-153 | Line item processing loop | Extract metadata from each item |
| 196 | `handleCheckoutSessionCompleted()` | Main webhook handler |
| ~300+ | `upsertOrder()` | Create order with all line items |
| ~400+ | `createLicenseForOrder()` | Generate license for each product |
| ~500+ | `syncOrderWithGhlWithRetry()` | Sync all items to CRM |

---

### 💰 Price Resolution
**File**: `apps/store/lib/payments/stripe.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `resolvePriceForEnvironment()` | 227-243 | Main function used by checkout route |
| `ensureTestPriceExists()` | 89-225 | Auto-sync live prices to test mode |
| `getStripeClient()` | ~10-50 | Get configured Stripe instance |

**Key behavior**:
```typescript
// If in test mode and price doesn't exist:
// Automatically clone from live to test
// This means: no manual price creation needed for test mode
```

---

### ✅ Unit Tests
**File**: `apps/store/tests/unit/app/checkout-route.test.ts`

| Line Range | Code | Purpose |
|-----------|------|---------|
| 24-34 | Test setup | Mock `STRIPE_OPTIONAL_BUNDLE_PRICE_ID = "price_optional_bundle"` |
| 45-53 | Mock setup | Set return values for price resolution |
| 87-98 | Test execution | Call GET handler with mocked Stripe |
| 101-110 | **Verification** | Assert `optional_items` included in params with correct structure |

**Example assertion**:
```typescript
expect(params).toMatchObject({
  optional_items: [
    {
      price: "price_optional_test_456",
      quantity: 1,
      adjustable_quantity: {
        enabled: true,
        minimum: 0,
        maximum: 1,
      },
    },
  ],
});
```

---

### 🗑️ Legacy Code Cleanup
**File**: `apps/store/lib/products/product-schema.ts`

| Line | Code | Purpose |
|------|------|---------|
| 394 | `order_bump: z.any().optional().transform(() => undefined)` | Strips legacy field |
| 611 | `.transform(({ order_bump: _legacyOrderBump, ...rest }) => rest)` | Remove from final object |

**Verification test**: `apps/store/tests/unit/lib/product-schema.test.ts`
```typescript
it("ignores legacy order_bump fields without failing validation", () => {
  const result = validateProduct({...product, order_bump: {...}});
  expect(result.data).not.toHaveProperty("order_bump");
});
```

**Deprecated UI component** (no longer used for checkout):
- `packages/ui/src/sections/PricingCta.tsx` - Contains old `orderBump` prop

---

## Data Flow Trace

### When checkout route is called:

```
GET /checkout/instagram-downloader
  ↓
app/checkout/[slug]/route.ts::GET()
  ├─ getProductData("instagram-downloader")          [Product JSON loaded]
  ├─ getOfferConfig("instagram-downloader")          [Stripe config extracted]
  ├─ resolvePriceForEnvironment({                     [Main product price]
  │    priceId: "price_instagram_live_123"
  │  })
  │  → Returns: { id: "price_instagram_test_789" }
  │
  ├─ Read env var: process.env.STRIPE_OPTIONAL_BUNDLE_PRICE_ID
  │  → "price_serp_blocks_live_9700"
  │
  ├─ IF env var exists:
  │  ├─ resolvePriceForEnvironment({                  [Optional item price]
  │  │    priceId: "price_serp_blocks_live_9700"
  │  │  })
  │  │  → Returns: { id: "price_serp_blocks_test_456" }
  │  │
  │  └─ optionalItems.push({
  │       price: "price_serp_blocks_test_456",
  │       quantity: 1,
  │       adjustable_quantity: {...}
  │     })
  │
  ├─ Build session params:
  │  {
  │    line_items: [{ price: "price_instagram_test_789", ... }],
  │    optional_items: [{ price: "price_serp_blocks_test_456", ... }],
  │    metadata: {...},
  │    ...
  │  }
  │
  └─ stripe.checkout.sessions.create(params)
     ↓
  Stripe API creates session
     ↓
  Returns: { url: "https://checkout.stripe.com/cs_test_123" }
     ↓
  Browser redirects to Stripe Checkout
     ↓
  Customer sees:
    - Instagram Downloader: $17.00
    - SERP Blocks: $97.00 [Add to order button]
```

### When payment completes:

```
Stripe webhook: checkout.session.completed
  ↓
stripe-webhook/events/checkout-session-completed.ts::handleCheckoutSessionCompleted()
  ├─ normalizeMetadata(session.metadata)             [Extract metadata]
  │
  ├─ collectLineItemTagData(session)                 [← Fetches ALL items]
  │  ├─ stripe.checkout.sessions.listLineItems(sessionId, {
  │  │    expand: ["data.price.product"],
  │  │    limit: 100
  │  │  })
  │  │
  │  └─ Loops through all items:
  │     ├─ Item 1: instagram-downloader ($17)
  │     └─ Item 2: optional_downloader_bundle ($97)
  │
  ├─ upsertOrder({
  │    lineItems: [instagram, serp-blocks],           [Both items in order]
  │    metadata: {...}
  │  })
  │
  ├─ FOR EACH line item:
  │  └─ createLicenseForOrder({
  │       productSlug: ["instagram-downloader", "optional_downloader_bundle"]
  │     })
  │
  ├─ syncOrderWithGhlWithRetry({
  │    tags: [all tags from both items]              [Sync to CRM]
  │  })
  │
  └─ recordWebhookLog(eventId, "success")
```

---

## Critical Code Path

The one if-statement that activates the feature:

```typescript
// Line 118-119
const optionalBundlePriceId = process.env.STRIPE_OPTIONAL_BUNDLE_PRICE_ID;
if (optionalBundlePriceId) {  // ← THIS DECIDES EVERYTHING
  // Lines 120-141: Resolve price and add to optional_items
}
// Lines 166-167: Inject into session if array has items
if (optionalItems.length > 0) {
  params.optional_items = optionalItems;  // ← THIS SENDS TO STRIPE
}
```

**Decision tree**:

```
STRIPE_OPTIONAL_BUNDLE_PRICE_ID env var?
│
├─ YES (e.g., "price_1XXX...")
│  ├─ Price exists in Stripe?
│  │  ├─ YES → Add to optional_items → Pass to Stripe → Feature active ✅
│  │  └─ NO → Log warning → Continue without optional items → Graceful ⚠️
│  │
│  └─ Result: Optional item shows in checkout (if price valid)
│
└─ NO (not set)
   └─ optional_items stays [] → Not passed to Stripe → Feature inactive
      └─ Result: Normal checkout, no optional items
```

---

## Environment Variable Only Control

Everything is keyed off one variable:

```bash
# Local development
echo "STRIPE_OPTIONAL_BUNDLE_PRICE_ID=price_test_123" >> .env

# Vercel staging
UI: Settings → Environment Variables → Add:
    Name: STRIPE_OPTIONAL_BUNDLE_PRICE_ID
    Value: price_test_123
    Environments: Preview

# Vercel production
Same process, use price_live_123 (live Stripe price)
```

No code changes needed. Just set the variable.

---

## Files Summary

| File | Type | Status | Role |
|------|------|--------|------|
| `app/checkout/[slug]/route.ts` | Implementation | ✅ Complete | Main handler |
| `lib/payments/stripe.ts` | Implementation | ✅ Complete | Price resolution |
| `lib/payments/stripe-webhook/events/checkout-session-completed.ts` | Implementation | ✅ Complete | Order processing |
| `lib/products/product-schema.ts` | Implementation | ✅ Complete | Legacy cleanup |
| `tests/unit/app/checkout-route.test.ts` | Testing | ✅ Complete | Unit tests |
| `tests/unit/lib/product-schema.test.ts` | Testing | ✅ Complete | Legacy field cleanup |
| `.env` (local) or Vercel settings | Configuration | ⏳ Needs setup | Activation |
| `packages/ui/src/sections/PricingCta.tsx` | UI (deprecated) | ℹ️ Still exists | Not used for checkout |

---

## Activation Checklist

- [ ] Find SERP Blocks Stripe price ID (test mode: `price_test_...`, live mode: `price_live_...`)
- [ ] Add to local `.env`: `STRIPE_OPTIONAL_BUNDLE_PRICE_ID=price_test_...`
- [ ] Add to Vercel staging environment variables
- [ ] Test locally: `pnpm dev` → navigate to product → verify optional item
- [ ] Test on staging: Wait for Vercel rebuild → navigate → verify
- [ ] Run validation: `pnpm lint && pnpm typecheck && pnpm test:unit`
- [ ] Add to Vercel production environment variables (with live price ID)
- [ ] Monitor logs for `checkout.optional_bundle_price_unavailable` warnings

