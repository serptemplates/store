# Issue #106: Quick Implementation Checklist

## Summary
Add order bump/upsell for "All Downloaders Bundle" (+$47) on checkout pages.

## Quick Reference

### Files to Create/Modify

#### 1. Create Bundle Product (New File)
```bash
apps/store/data/products/all-downloaders-bundle.yaml
```
- Price: $64 (standalone) or +$47 (as upgrade)
- Contains entitlements for all 95+ downloaders
- Stripe price_id needed

#### 2. Update Schema (Modify)
```bash
apps/store/lib/products/product-schema.ts
```
Add order bump configuration schema:
```typescript
order_bump: z.object({
  enabled: z.boolean().default(false),
  target_product_slug: z.string(),
  additional_price: z.number(),
  title: z.string(),
  description: z.string().optional(),
}).optional()
```

#### 3. Create UI Component (New File)
```bash
apps/store/components/checkout/OrderBumpCard.tsx
```
Checkbox component for order bump selection

#### 4. Update Checkout View (Modify)
```bash
apps/store/components/checkout/EmbeddedCheckoutView.tsx
```
- Add order bump state
- Update price calculation
- Pass order bump to API

#### 5. Update Session API (Modify)
```bash
apps/store/app/api/checkout/session/route.ts
```
- Handle order bump in request
- Create multiple line items
- Update metadata

#### 6. Update Webhook Handler (Modify)
```bash
apps/store/app/api/webhooks/stripe/route.ts
```
- Detect bundle purchases
- Generate licenses for all products

#### 7. Add Analytics (Modify)
```bash
apps/store/lib/analytics/checkout.ts
```
- Track order bump views
- Track acceptances/rejections

#### 8. Add Tests (New Files)
```bash
apps/store/tests/checkout/order-bump.test.ts
apps/store/tests/e2e/order-bump-checkout.test.ts
```

---

## Implementation Checklist

### Pre-Implementation: Payment Method Analysis
- [ ] Confirm current payment method distribution:
  - Stripe/PayPal products: ~50 (embedded checkout)
  - GHL payment link products: ~45 (external redirect)
- [ ] Decide on GHL product strategy:
  - [ ] Option A: Disable order bump for GHL products (simpler)
  - [ ] Option B: Redirect to bundle GHL link when bump selected (more complex)
- [ ] Create bundle GHL payment link in GoHighLevel (if doing Option B)

### Phase 1: Foundation
- [ ] Create all-downloaders-bundle.yaml product
- [ ] Create Stripe product and price in Dashboard
- [ ] **Create PayPal pricing configuration**
- [ ] **Create GHL payment link for bundle (if supporting GHL products)**
- [ ] Add price_id to bundle YAML
- [ ] Update product-schema.ts with order_bump schema
- [ ] Run validation: `pnpm validate:products`
- [ ] Add order_bump config to 3-5 test products (Stripe/PayPal only initially)
- [ ] **Decide: Enable for GHL products or disable?**

### Phase 2: UI Components
- [ ] Create OrderBumpCard.tsx component
- [ ] Add prop types and styling
- [ ] Implement checkbox/toggle interaction
- [ ] Add visual pricing breakdown
- [ ] Update EmbeddedCheckoutView.tsx
- [ ] Add order bump state management
- [ ] Update price calculation logic
- [ ] Test UI in browser

### Phase 3: Backend
- [ ] Update checkoutSessionSchema in route.ts
- [ ] **Add order bump handling in POST /api/checkout/session (Stripe)**
- [ ] Implement multi-line item logic for Stripe
- [ ] **Add order bump handling in POST /api/paypal/create-order (PayPal)**
- [ ] Implement multi-item logic for PayPal
- [ ] Update session metadata
- [ ] Test with Stripe test mode
- [ ] **Test with PayPal sandbox**
- [ ] Update webhook handler for bundles (Stripe + PayPal)
- [ ] Implement bundle license generation
- [ ] **Handle GHL products (disable or redirect)**
- [ ] Test end-to-end flow for all payment methods

### Phase 4: Analytics
- [ ] Add trackOrderBumpViewed event
- [ ] Add trackOrderBumpToggled event
- [ ] Update ecommerce item tracking
- [ ] Test GTM events in preview
- [ ] Verify data in analytics dashboard

### Phase 5: Testing
- [ ] Write unit tests for order bump logic
- [ ] Write integration tests for API
- [ ] Write E2E tests for checkout flow
- [ ] Test with real Stripe test cards
- [ ] Verify license generation
- [ ] Test GHL integration
- [ ] Run full test suite: `pnpm test:safe`

### Phase 6: Configuration
- [ ] Create bulk update script
- [ ] Add order_bump to all downloader products
- [ ] Verify YAML syntax
- [ ] Validate all products
- [ ] Review pricing configuration

### Phase 7: Launch
- [ ] Add feature flag: ENABLE_ORDER_BUMP
- [ ] Deploy to staging
- [ ] Test in staging environment
- [ ] Soft launch to 10% traffic
- [ ] Monitor key metrics:
  - [ ] Acceptance rate
  - [ ] Average order value
  - [ ] Conversion rate
  - [ ] Error rates
- [ ] Full rollout to 100%

---

## Testing Commands

```bash
# Lint
pnpm lint

# Typecheck
pnpm typecheck

# Unit tests
pnpm test

# E2E tests (requires Playwright install)
pnpm test:smoke

# Full validation
pnpm test:safe

# Validate products
pnpm validate:products
```

---

## Payment Method Implementation Details

### 1. Stripe Checkout (~50 products)
**Location**: `/checkout?product=slug` → Embedded checkout page

**Implementation**:
- Update `/api/checkout/session` to accept `orderBump` parameter
- Create multiple line items when bump selected:
  ```typescript
  lineItems: [
    { price: basePriceId, quantity: 1 },
    { price: bundlePriceId, quantity: 1 }
  ]
  ```
- Update webhook handler to detect bundle purchases via metadata

**Testing**:
- Use Stripe test cards: `4242 4242 4242 4242`
- Verify both line items appear in Stripe Dashboard
- Confirm bundle licenses are generated

### 2. PayPal Checkout (available on all non-GHL products)
**Location**: `/checkout?product=slug` → Toggle to PayPal option

**Implementation**:
- Update `/api/paypal/create-order` to accept `orderBump` parameter
- Create multiple items in PayPal order:
  ```typescript
  items: [
    { name: baseName, unit_amount: basePrice, quantity: "1" },
    { name: bundleName, unit_amount: bundlePrice, quantity: "1" }
  ]
  ```
- Update PayPal webhook handler to detect bundle purchases

**Testing**:
- Use PayPal sandbox account
- Verify both items appear in PayPal order
- Confirm total is correct (base + bundle)
- Verify bundle licenses are generated

### 3. GHL Payment Links (~45 products)
**Location**: Product page CTA → External redirect to `ghl.serp.co/payment-link/...`

**Challenge**: No control over GoHighLevel checkout UI

**Option A: Disable Order Bump (Recommended)** ✅
```typescript
// In productToHomeTemplate or checkout page
const hasGHLLink = product.buy_button_destination?.includes('ghl.serp.co');
const showOrderBump = !hasGHLLink && product.order_bump?.enabled;
```
- Pros: Simple, clean, no edge cases
- Cons: Only 50 products get order bump (still majority)

**Option B: Pre-Redirect Modal with Bundle Link**
1. Create bundle GHL payment link in GoHighLevel
2. On product page, before CTA click:
   - Show modal: "Upgrade to All Downloaders for +$47?"
   - If yes → Redirect to bundle GHL link
   - If no → Redirect to original product GHL link
3. Track decision with analytics

- Pros: All 95 products can have upsell
- Cons: More complex, loses original product context
- Adds: 3-4 hours implementation time

**Recommendation**: Start with **Option A**, evaluate Option B based on demand.

---

## Key Code Snippets

### 1. Product YAML Configuration
```yaml
# Add to each downloader product
order_bump:
  enabled: true
  target_product_slug: all-downloaders-bundle
  additional_price: 47.00
  title: "Upgrade to ALL Downloaders"
  description: "Get lifetime access to 95+ downloaders"
  badge_text: "SAVE $1,500+"
```

### 2. Checkout Request Payload

**For Stripe/PayPal Checkout**:
```typescript
{
  offerId: "tiktok-downloader",
  quantity: 1,
  customer: { email: "user@example.com" },
  orderBump: {
    enabled: true,
    targetProductSlug: "all-downloaders-bundle",
    additionalPrice: 47.00
  }
}
```

### 3. Stripe Line Items
```typescript
// When order bump is selected
lineItems: [
  { price: "price_xxxxx", quantity: 1 },  // Base product
  { price: "price_yyyyy", quantity: 1 }   // Bundle upgrade
]
```

### 4. PayPal Order Items
```typescript
// When order bump is selected in PayPal
const items = [
  {
    name: "TikTok Downloader",
    unit_amount: { currency_code: "USD", value: "17.00" },
    quantity: "1"
  },
  {
    name: "All Downloaders Bundle",
    unit_amount: { currency_code: "USD", value: "47.00" },
    quantity: "1"
  }
];

const amount = {
  currency_code: "USD",
  value: "64.00",  // 17 + 47
  breakdown: {
    item_total: { currency_code: "USD", value: "64.00" }
  }
};
```

### 5. Session Metadata
```typescript
metadata: {
  orderBumpAccepted: "true",
  orderBumpProduct: "all-downloaders-bundle",
  orderBumpPrice: "47.00",
  baseProduct: "tiktok-downloader",
  totalPrice: "64.00"
}
```

---

## Important Notes

### Environment Variables
- `STRIPE_SECRET_KEY` - Production Stripe key
- `STRIPE_SECRET_KEY_TEST` - Test mode key
- `STRIPE_WEBHOOK_SECRET` - For webhook verification
- `ENABLE_ORDER_BUMP` - Feature flag (optional)

### Stripe Dashboard Setup
1. Create "All Downloaders Bundle" product
2. Create price: $64 (or $47 if upgrade-only)
3. Copy price_id to bundle YAML
4. Test with test cards before going live

### License Generation
Bundle purchases must generate licenses for ALL downloader products:
- Query products where entitlements include "all-downloaders"
- Generate individual license key for each
- Store with reference to bundle purchase
- Send consolidated email with all keys

### Analytics Events
Track these key events:
- `order_bump_viewed` - Checkout page load with bump visible
- `order_bump_toggled` - User checks/unchecks bump
- `checkout_started` - With/without bump in items
- `purchase_complete` - With/without bump in items

### Pricing Psychology
- Original: $17 per downloader × 95 = $1,615
- Bundle standalone: $64 (96% discount)
- Upgrade price: +$47 (show as $64 total)
- Savings message: "Save $1,500+"

---

## Rollback Plan

If issues arise:
1. Set `ENABLE_ORDER_BUMP=false` environment variable
2. Or set `order_bump.enabled: false` in product YAMLs
3. Deploy immediately
4. No data loss - existing checkouts still work
5. No code rollback needed

---

## Success Criteria

### Week 1 (Soft Launch)
- [ ] 0 fatal errors
- [ ] Acceptance rate: 10-30%
- [ ] Conversion rate stable or improved
- [ ] Support tickets < 5

### Month 1 (Full Launch)
- [ ] Acceptance rate: 15-25%
- [ ] AOV increase: +25-40%
- [ ] Revenue increase: $15-20K
- [ ] Customer satisfaction maintained

---

## Support & Documentation

- Full recommendation: `ISSUE_106_IMPLEMENTATION_RECOMMENDATION.md`
- Executive summary: `ISSUE_106_EXECUTIVE_SUMMARY.md`
- This checklist: `ISSUE_106_QUICK_CHECKLIST.md`

## Questions?
Contact: Team Lead / Product Manager
