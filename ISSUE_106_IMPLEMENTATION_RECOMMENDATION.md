# Issue #106 Implementation Recommendation: Order Bump/Upsell Functionality

## Issue Summary
Add an 'order bump' / 'upsell' functionality on all downloader checkout pages where someone can select to "upgrade purchase for all downloaders" at +$47.

## Current Architecture Analysis

### 1. Checkout System
The current checkout system is built using:
- **Stripe Checkout** - Both embedded and hosted modes
- **PayPal integration** - Alternative payment method
- **API Route**: `apps/store/app/api/checkout/session/route.ts` (506 lines)
- **UI Component**: `apps/store/components/checkout/EmbeddedCheckoutView.tsx`
- **Product Schema**: `apps/store/lib/products/product-schema.ts`

### 2. Product Catalog
- **95 products** total in `apps/store/data/products/`
- Products are stored as YAML files
- Most products are "downloader" type products (TikTok, Instagram, YouTube, etc.)
- Individual product price: ~$17-67 (varies by product)
- Currently NO "all downloaders" bundle product exists

### 3. Stripe Integration
- Line items support in checkout session creation
- Custom line items with price_data for coupon handling (lines 264-356)
- Metadata tracking for all transactions
- Support for quantity adjustments and custom pricing

### 4. Analytics & Tracking
- Full ecommerce tracking via GTM
- Checkout flow tracking with events
- Affiliate tracking support
- Purchase metadata stored in PostgreSQL

## Recommended Implementation Strategy

### Option 1: Pre-Checkout UI Order Bump (RECOMMENDED) ⭐

**Description**: Add order bump as a checkbox/toggle on the checkout page BEFORE Stripe session creation.

**Advantages**:
- ✅ Works with existing Stripe line items system
- ✅ Clean UI/UX - users see full price before payment
- ✅ Easy to track and analyze
- ✅ No complex Stripe modifications needed
- ✅ Better conversion tracking
- ✅ Simpler to implement and test

**Implementation Steps**:

1. **Create "All Downloaders" Bundle Product** (~1-2 hours)
   - Create `/apps/store/data/products/all-downloaders-bundle.yaml`
   - Set appropriate metadata and entitlements
   - Add to product catalog

2. **Update Product Schema** (~30 min)
   ```typescript
   // Add optional upsell configuration to product schema
   upsell: z.object({
     enabled: z.boolean().default(false),
     product_slug: z.string(),
     additional_price: z.number(),
     title: z.string(),
     description: z.string().optional(),
   }).optional()
   ```

3. **Modify Checkout Component** (~3-4 hours)
   - Add state for order bump selection in `EmbeddedCheckoutView.tsx`
   - Create new `OrderBumpCard` component with checkbox
   - Display upgrade option prominently (before payment method selection)
   - Update price calculation dynamically when toggled
   - Show clear pricing breakdown

4. **Update API Session Creation** (~2-3 hours)
   - Modify `apps/store/app/api/checkout/session/route.ts`
   - Add logic to detect order bump in request
   - Create multiple line items when bump is selected:
     ```typescript
     lineItems: [
       { price: originalPriceId, quantity: 1 },
       { price: bundleUpgradePriceId, quantity: 1 }  // Additional $47
     ]
     ```
   - Update metadata to track order bump selection

5. **Update Analytics** (~1-2 hours)
   - Track order bump views
   - Track order bump acceptances/rejections
   - Update ecommerce events with both line items
   - Add conversion funnel tracking

6. **Update License Generation** (~2-3 hours)
   - Modify webhook handler to detect bundle purchases
   - Generate licenses for ALL products when bundle is purchased
   - Update GHL integration for bundle entitlements

7. **Create Tests** (~2-3 hours)
   - Unit tests for order bump logic
   - E2E tests for checkout with order bump
   - Test license generation for bundle purchases
   - Test analytics tracking

**Estimated Total Time**: 12-18 hours

**UI Mockup Concept**:
```
┌─────────────────────────────────────────┐
│  TikTok Downloader      $17.00          │
├─────────────────────────────────────────┤
│  ⚡ SPECIAL OFFER                        │
│  ☐ Upgrade to ALL Downloaders           │
│     • Get 95+ downloaders                │
│     • Lifetime access                    │
│     • Just +$47 more (Save $1,500+)     │
│                                          │
│  Total: $17.00 → $64.00                 │
├─────────────────────────────────────────┤
│  [Pay with Stripe] [Pay with PayPal]   │
└─────────────────────────────────────────┘
```

---

### Option 2: Stripe Native Order Bump

**Description**: Use Stripe's built-in upsell capabilities during checkout.

**Advantages**:
- ✅ Native Stripe feature
- ✅ Potential post-purchase upsell

**Disadvantages**:
- ❌ Limited customization
- ❌ Only works in hosted mode, not embedded
- ❌ Less control over UI/UX
- ❌ Harder to track and analyze
- ❌ May confuse users with separate charge

**Not Recommended** because you're using embedded checkout mode.

---

### Option 3: Post-Purchase Upsell Page

**Description**: Redirect to upsell page after initial purchase, before success page.

**Advantages**:
- ✅ Doesn't complicate initial checkout
- ✅ Can use persuasive copy and social proof

**Disadvantages**:
- ❌ Lower conversion rate (post-purchase friction)
- ❌ Two separate transactions
- ❌ More complex refund handling
- ❌ Worse user experience
- ❌ Requires additional Stripe session

**Not Recommended** for optimal conversion rates.

---

## Detailed Implementation Plan for Option 1 (RECOMMENDED)

### Phase 1: Foundation (Day 1)

#### 1.1 Create Bundle Product
```yaml
# apps/store/data/products/all-downloaders-bundle.yaml
slug: all-downloaders-bundle
platform: Multi-Platform
name: All Downloaders Bundle
tagline: Complete access to all 95+ downloaders
pricing:
  price: $64.00
  original_price: $1,500.00
  currency: USD
stripe:
  price_id: price_xxx  # Create in Stripe
  success_url: https://apps.serp.co/checkout/success
  cancel_url: https://apps.serp.co/checkout?product=all-downloaders-bundle
license:
  entitlements: ["all-downloaders"]
# ... other fields
```

#### 1.2 Update Product Schema
```typescript
// apps/store/lib/products/product-schema.ts
const orderBumpSchema = z.object({
  enabled: z.boolean().default(false),
  target_product_slug: z.string(),
  additional_price: z.number(),
  title: z.string(),
  description: z.string().optional(),
  badge_text: z.string().optional(),
}).optional();

// Add to productSchema
order_bump: orderBumpSchema,
```

#### 1.3 Configure Order Bumps on Downloader Products
Update each downloader product YAML to include:
```yaml
order_bump:
  enabled: true
  target_product_slug: all-downloaders-bundle
  additional_price: 47.00
  title: "Upgrade to ALL Downloaders"
  description: "Get lifetime access to 95+ downloaders"
  badge_text: "SAVE $1,500+"
```

### Phase 2: UI Components (Day 2)

#### 2.1 Create OrderBumpCard Component
```tsx
// apps/store/components/checkout/OrderBumpCard.tsx
interface OrderBumpCardProps {
  title: string;
  description: string;
  additionalPrice: number;
  originalPrice: number;
  badge?: string;
  selected: boolean;
  onToggle: (selected: boolean) => void;
}

export function OrderBumpCard({ ... }: OrderBumpCardProps) {
  return (
    <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold">⚡ {title}</h3>
            {badge && <span className="badge">{badge}</span>}
          </div>
          <p className="text-sm">{description}</p>
          <p className="font-bold mt-2">
            Only +${additionalPrice.toFixed(2)} more
          </p>
        </div>
      </div>
    </div>
  );
}
```

#### 2.2 Update EmbeddedCheckoutView
```tsx
// apps/store/components/checkout/EmbeddedCheckoutView.tsx

// Add state
const [orderBumpSelected, setOrderBumpSelected] = useState(false);
const [orderBumpConfig, setOrderBumpConfig] = useState<OrderBumpConfig | null>(null);

// Load order bump config from product
useEffect(() => {
  // Fetch product data and check for order_bump configuration
  // Set orderBumpConfig if enabled
}, [productSlug]);

// Update price calculation
const basePrice = product?.price ?? 0;
const orderBumpPrice = orderBumpSelected ? (orderBumpConfig?.additional_price ?? 0) : 0;
const finalPrice = basePrice + orderBumpPrice;

// Add order bump to UI (before payment method selector)
{orderBumpConfig && (
  <OrderBumpCard
    title={orderBumpConfig.title}
    description={orderBumpConfig.description ?? ""}
    additionalPrice={orderBumpConfig.additional_price}
    originalPrice={basePrice}
    badge={orderBumpConfig.badge_text}
    selected={orderBumpSelected}
    onToggle={setOrderBumpSelected}
  />
)}
```

### Phase 3: Backend Integration (Day 3)

#### 3.1 Update Checkout Session API
```typescript
// apps/store/app/api/checkout/session/route.ts

// Add to request schema
const checkoutSessionSchema = z.object({
  // ... existing fields
  orderBump: z.object({
    enabled: z.boolean(),
    targetProductSlug: z.string().optional(),
    additionalPrice: z.number().optional(),
  }).optional(),
});

// In POST handler, after price resolution:
let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

if (parsedBody.orderBump?.enabled && parsedBody.orderBump.targetProductSlug) {
  // Get bundle product configuration
  const bundleOffer = getOfferConfig(parsedBody.orderBump.targetProductSlug);
  
  if (!bundleOffer) {
    return buildErrorResponse("Bundle product not found");
  }
  
  const bundlePrice = await resolvePriceForEnvironment({
    id: bundleOffer.id,
    priceId: bundleOffer.stripePriceId,
    // ...
  });
  
  // Create line items for both products
  lineItems = [
    { price: price.id, quantity: 1 },  // Original product
    { price: bundlePrice.id, quantity: 1 }  // Bundle upgrade
  ];
  
  // Update metadata
  sessionMetadata.orderBumpAccepted = "true";
  sessionMetadata.orderBumpProduct = parsedBody.orderBump.targetProductSlug;
  sessionMetadata.orderBumpPrice = String(parsedBody.orderBump.additionalPrice);
} else {
  lineItems = [{ price: price.id, quantity: 1 }];
  sessionMetadata.orderBumpAccepted = "false";
}

// Continue with session creation using lineItems
```

#### 3.2 Update Webhook Handler
```typescript
// apps/store/app/api/webhooks/stripe/route.ts

// In checkout.session.completed handler:
if (session.metadata?.orderBumpAccepted === "true") {
  // Generate licenses for ALL products
  await generateBundleLicenses({
    email: customerEmail,
    bundleSlug: session.metadata.orderBumpProduct,
    sessionId: session.id,
  });
} else {
  // Generate single product license (existing logic)
  await generateLicense({
    email: customerEmail,
    productSlug: session.metadata.offerId,
    sessionId: session.id,
  });
}
```

### Phase 4: Analytics & Tracking (Day 4)

#### 4.1 Add Tracking Events
```typescript
// apps/store/lib/analytics/checkout.ts

export function trackOrderBumpViewed(data: {
  productSlug: string;
  bundleSlug: string;
  additionalPrice: number;
}) {
  // Track impression
  gtmPush({
    event: "order_bump_viewed",
    ...data,
  });
}

export function trackOrderBumpToggled(data: {
  productSlug: string;
  bundleSlug: string;
  accepted: boolean;
}) {
  gtmPush({
    event: "order_bump_toggled",
    ...data,
  });
}
```

#### 4.2 Update Ecommerce Tracking
```typescript
// When order bump is selected, update items array
const ecommerceItems = [
  {
    item_id: product.slug,
    item_name: product.name,
    price: basePrice,
    quantity: 1,
  },
];

if (orderBumpSelected) {
  ecommerceItems.push({
    item_id: "all-downloaders-bundle",
    item_name: "All Downloaders Bundle",
    price: orderBumpPrice,
    quantity: 1,
  });
}
```

### Phase 5: Testing (Day 5)

#### 5.1 Unit Tests
```typescript
// apps/store/tests/lib/order-bump.test.ts
describe("Order Bump Logic", () => {
  it("calculates total with order bump", () => {
    // Test price calculation
  });
  
  it("includes correct line items when bump is selected", () => {
    // Test line items generation
  });
  
  it("handles order bump disabled", () => {
    // Test when order bump is not configured
  });
});
```

#### 5.2 E2E Tests
```typescript
// apps/store/tests/e2e/order-bump-checkout.test.ts
describe("Order Bump Checkout Flow", () => {
  it("displays order bump on checkout page", async () => {
    // Test UI rendering
  });
  
  it("completes purchase with order bump", async () => {
    // Test full checkout flow
  });
  
  it("generates bundle licenses when bump is accepted", async () => {
    // Test license generation
  });
});
```

### Phase 6: Configuration Rollout

#### 6.1 Identify Downloader Products
```bash
# Script to find all downloader products
cd apps/store/data/products
grep -l "Downloader" *.yaml | wc -l
```

#### 6.2 Bulk Update Script
```typescript
// scripts/enable-order-bump.ts
import fs from 'fs';
import yaml from 'yaml';

const products = getAllProducts();
const downloaderProducts = products.filter(p => 
  p.name.includes('Downloader') && 
  p.slug !== 'all-downloaders-bundle'
);

for (const product of downloaderProducts) {
  const filePath = `./apps/store/data/products/${product.slug}.yaml`;
  const data = yaml.parse(fs.readFileSync(filePath, 'utf-8'));
  
  data.order_bump = {
    enabled: true,
    target_product_slug: 'all-downloaders-bundle',
    additional_price: 47.00,
    title: 'Upgrade to ALL Downloaders',
    description: 'Get lifetime access to 95+ downloaders',
    badge_text: 'SAVE $1,500+',
  };
  
  fs.writeFileSync(filePath, yaml.stringify(data));
}
```

---

## Technical Considerations

### 1. License Management
- **Challenge**: Need to generate multiple licenses when bundle is purchased
- **Solution**: Create a `license-generator` service that:
  - Detects bundle purchases via metadata
  - Queries all products with matching entitlements
  - Generates individual license keys for each
  - Stores in database with bundle reference

### 2. Pricing Strategy
- Base downloader: $17
- Bundle upgrade: +$47
- Total: $64 (vs buying all separately at ~$1,500+)
- **Savings**: ~96% discount
- **Psychology**: Anchoring effect with "original" price

### 3. Product Entitlements
```typescript
// Entitlement resolution
if (purchaseMetadata.orderBumpAccepted === "true") {
  // User gets ALL downloader entitlements
  const entitlements = ["all-downloaders"];
} else {
  // User gets single product entitlement
  const entitlements = [product.slug];
}
```

### 4. Stripe Configuration
- Create bundle product in Stripe Dashboard
- Set price: $47 (not $64, since it's an ADD-ON)
- Or create price: $64 and use two separate line items
- **Recommended**: Use $64 bundle price as standalone option too

### 5. GHL Integration
- Update webhook to handle bundle purchases
- Create bundle-specific tags
- Set custom fields for all-downloaders access
- Update opportunity value to reflect bundle price

---

## Data Schema Updates

### Product YAML Schema Addition
```yaml
order_bump:
  enabled: boolean
  target_product_slug: string
  additional_price: number
  title: string
  description: string
  badge_text: string
```

### Stripe Session Metadata
```typescript
{
  orderBumpAccepted: "true" | "false",
  orderBumpProduct?: string,  // "all-downloaders-bundle"
  orderBumpPrice?: string,    // "47.00"
  baseProduct: string,        // "tiktok-downloader"
  basePrice: string,          // "17.00"
  totalPrice: string,         // "64.00"
}
```

### Database Schema (if storing order bump metrics)
```sql
CREATE TABLE order_bump_metrics (
  id SERIAL PRIMARY KEY,
  product_slug VARCHAR(255),
  bump_product_slug VARCHAR(255),
  viewed_at TIMESTAMP,
  accepted BOOLEAN,
  session_id VARCHAR(255),
  customer_email VARCHAR(255)
);
```

---

## A/B Testing Strategy

### Variant A: Order Bump (Recommended Implementation)
- Show upgrade option prominently
- Clear value proposition
- One-click toggle

### Variant B: No Order Bump (Control)
- Standard checkout
- No upsell

### Metrics to Track
- **Impression Rate**: % of checkouts that see order bump
- **Acceptance Rate**: % that select order bump
- **AOV (Average Order Value)**: With vs without bump
- **Revenue Per Visitor**: Total revenue impact
- **Conversion Rate**: Overall checkout completion

### Success Criteria
- Acceptance rate > 15%
- AOV increase > 25%
- No negative impact on base conversion rate

---

## Risk Assessment

### Low Risk ✅
- UI/UX changes are isolated
- No breaking changes to existing checkout
- Easy to disable via configuration
- Backwards compatible

### Medium Risk ⚠️
- License generation complexity for bundles
- Need to test thoroughly with Stripe test mode
- GHL integration updates

### Mitigation Strategies
1. **Feature Flag**: Add `ENABLE_ORDER_BUMP` env variable
2. **Gradual Rollout**: Enable for 10% → 50% → 100% of traffic
3. **Monitoring**: Track errors and conversion rates closely
4. **Rollback Plan**: Can disable order bump via product YAML updates

---

## Success Metrics & KPIs

### Primary Metrics
- **Order Bump Acceptance Rate**: Target 15-25%
- **Revenue Increase**: Target +$12-20 per checkout (assuming 25% acceptance)
- **AOV**: Baseline $17 → Target $22-25

### Secondary Metrics
- Cart abandonment rate (ensure no increase)
- Checkout completion time
- Support tickets about pricing
- Refund rate for bundle purchases

---

## Timeline & Resources

### Development Timeline
- **Week 1**: Foundation + UI components (Option 1 implementation)
- **Week 2**: Backend integration + testing
- **Week 3**: Soft launch (10% traffic) + monitoring
- **Week 4**: Full rollout + optimization

### Required Resources
- **1 Backend Developer**: API and webhook updates
- **1 Frontend Developer**: UI components and checkout flow
- **1 QA Engineer**: Testing and validation
- **1 Product Manager**: Configuration and rollout strategy

### Dependencies
- Stripe account access
- Product catalog understanding
- License generation system access
- Analytics/tracking system

---

## Alternative Considerations

### Dynamic Pricing
Consider making the upgrade price dynamic based on:
- Original product price
- User's purchase history
- Seasonal promotions
- Affiliate relationships

### Multiple Tiers
Instead of just "All Downloaders", consider:
- **Tier 1**: Social Media Downloaders Bundle (+$29)
- **Tier 2**: All Downloaders Bundle (+$47)
- **Tier 3**: Premium Support Bundle (+$67)

### Upsell Sequence
Post-purchase flow:
1. Initial purchase: Single downloader ($17)
2. Thank you page: Upgrade to bundle offer (-$17 credit)
3. Email follow-up: Limited time upgrade offer

---

## Conclusion

**RECOMMENDED APPROACH**: Option 1 - Pre-Checkout UI Order Bump

This approach provides:
- ✅ Best user experience
- ✅ Highest expected conversion rate
- ✅ Clean implementation with existing tech stack
- ✅ Easy to test and iterate
- ✅ Full control over UI/UX
- ✅ Comprehensive analytics tracking

**Expected Impact**:
- 15-25% of checkout sessions accept order bump
- Average order value increases from $17 to $22-25
- Additional $15-20K/month revenue (assuming 1000 checkouts/month)
- 96% perceived discount drives urgency

**Implementation Risk**: LOW
**Expected ROI**: HIGH
**Time to Market**: 2-3 weeks

---

## Next Steps

1. **Approve approach** (Option 1 recommended)
2. **Create Stripe bundle product** and price
3. **Create all-downloaders-bundle.yaml** product file
4. **Implement UI components** (OrderBumpCard)
5. **Update checkout API** to handle multiple line items
6. **Test thoroughly** in Stripe test mode
7. **Soft launch** to 10% of traffic
8. **Monitor metrics** and optimize
9. **Full rollout** once validated

**Questions or concerns?** Ready to start implementation once approach is confirmed.
