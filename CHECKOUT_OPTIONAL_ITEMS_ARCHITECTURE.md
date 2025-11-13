# Checkout Optional Items Architecture

## Overview

The optional items (order bump) feature is **fully implemented** in the codebase. It allows customers to add complementary products during Stripe Checkout using Stripe's native `optional_items` feature.

**Status**: Ready; activate by configuring optional items on the offer or in product JSON — do not store per-product optional item IDs in environment variables.


## How It Works

### 1. Checkout Route Handler
**File**: `apps/store/app/checkout/[slug]/route.ts`

The GET endpoint builds optional items from per-offer `optionalItems` or product's `default_price`. Example approach:

```typescript
const optionalItems: CheckoutOptionalItem[] = [];

for (const optionalItem of (offer.optionalItems || [])) {
  const liveStripe = getStripeClient("live");
  const product = await liveStripe.products.retrieve(optionalItem.product_id);
  const priceIdFromOffer = optionalItem.price_id;
  const priceIdToResolve = priceIdFromOffer ?? (typeof product.default_price === "string" ? product.default_price : product.default_price?.id);
  if (!priceIdToResolve) continue; // Skip optional item if no price is defined
  const optionalPrice = await resolvePriceForEnvironment({ id: optionalItem.product_id, priceId: priceIdToResolve, productName: product.name });
  optionalItems.push({ price: optionalPrice.id, quantity: optionalItem.quantity ?? 1, adjustable_quantity: { enabled: true, minimum: 0, maximum: 1 } });
}
```

**Key behaviors**:

### 2. Checkout Session Creation
**Location**: Same file, lines 147-167

The optional items are passed to Stripe's API when creating the session:

```typescript
const params: CheckoutSessionCreateParamsWithOptionalItems = {
  mode: offer.mode,
  allow_promotion_codes: true,
  line_items: [
    {
      price: resolvedPrice.id,           // Main product
      quantity,
      adjustable_quantity: adjustableQuantity,
    },
  ],
  success_url: offer.successUrl,
  cancel_url: offer.cancelUrl,
  metadata,
  consent_collection: {
    terms_of_service: "required",
  },
  customer_creation: "always",
};

if (optionalItems.length > 0) {
  params.optional_items = optionalItems;  // ← Optional items injected here
}

const stripe = getStripeClient();
const session = await stripe.checkout.sessions.create(params);
```

**Type definitions** (lines 10-18):
```typescript
type CheckoutOptionalItem = {
  price: string;
  quantity: number;
  adjustable_quantity?: Stripe.Checkout.SessionCreateParams.LineItem.AdjustableQuantity;
};

type CheckoutSessionCreateParamsWithOptionalItems = Stripe.Checkout.SessionCreateParams & {
  optional_items?: CheckoutOptionalItem[];
};
```

### 3. Stripe Checkout Presentation
Stripe's hosted checkout automatically:

### 4. Webhook Processing
**File**: `apps/store/lib/payments/stripe-webhook/events/checkout-session-completed.ts`

The `handleCheckoutSessionCompleted()` function processes successful payments:

```typescript
async function collectLineItemTagData(
  session: Stripe.Checkout.Session,
  stripeMode: StripeModeInput,
): Promise<{ tagIds: string[]; productSlugs: string[] }> {
  const tagIds: string[] = [];
  const productSlugs: string[] = [];

  if (!session.id) {
    return { tagIds, productSlugs };
  }

  try {
    const stripe = getStripeClient(stripeMode);
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ["data.price.product"],
      limit: 100,  // Fetches ALL line items (main + optional)
    });

    // Processes both line items and optional items...
```

**Key behaviors**:

### 5. Order & License Processing

After checkout completion, the order handler:

The system treats optional items as regular line items in the fulfillment pipeline.


## Optional Items Configuration

Optional items must be configured on an offer or within the product JSON. There is no env-var activation. Prefer setting the optional item's `price_id` per-offer so you can set a specific price for the product in this offer. If the optional offer item has no `price_id`, the route attempts to resolve `product.default_price` from Stripe.

Examples:


```json
{
  "optional_items": [{
    "product_id": "prod_optional_bundle",
    "price_id": "price_live_override_97",
    "quantity": 1
  }]
}
```


### Obtaining the Price ID

1. **In Stripe Dashboard**:
   - Go to Products → Find SERP Blocks
   - Click into pricing section
   - Copy the price ID (e.g., `price_1XXX...`)

2. **Via Stripe API** (if SERP Blocks doesn't have a price yet):
   ```bash
   # Create a new price
   curl https://api.stripe.com/v1/products \
     -H "Authorization: Bearer sk_live_..." \
     -d "name=SERP Blocks" \
     -d "description=Optional SERP Blocks during checkout"

   # Then create a price for it
   curl https://api.stripe.com/v1/prices \
     -H "Authorization: Bearer sk_live_..." \
     -d "product=prod_xxxxx" \
     -d "unit_amount=9700" \
     -d "currency=usd"
   ```


## Testing

### Unit Tests
**File**: `apps/store/tests/unit/app/checkout-route.test.ts`

Test case "injects Dub attribution metadata and redirects to Stripe" verifies:

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

### Manual Testing

1. **Navigate to any product** (not SERP Blocks):
   ```
   https://staging.apps.serp.co/instagram-downloader
   ```

2. **Click CTA button** → "Get it Now"
   - Should redirect to Stripe Checkout

3. **Verify optional item displays**:
   - Look for "SERP Blocks" in the checkout
   - Should show "Add to order" option
   - Price should display correctly ($97)

4. **Test interactions**:
   - Click add → quantity should increase
   - Click remove → quantity should decrease
   - Should be able to keep it removed

5. **Complete test payment**:
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - Zip: Any 5 digits

6. **Verify in Stripe Dashboard**:
   - Go to Payments → search for payment
   - Should show both line items:
     - Main product (e.g., Instagram Downloader - $17)
     - Optional item (SERP Blocks - $97)


## Error Handling

### If Optional Price Unavailable

If an optional item's `price_id` or product `default_price` is configured but the price can't be resolved in the current Stripe environment:

```typescript
} catch (error) {
  logger.warn("checkout.optional_item_price_unavailable", {
    slug,
    optionalBundlePriceId,
    error: error instanceof Error ? error.message : String(error),
  });
}
```

**Behavior**:

This graceful degradation ensures checkout never breaks due to optional items misconfiguration.


## Legacy Code Cleanup

### Deprecated Fields
The `order_bump` field in product JSON is **legacy and ignored**:

  ```typescript
  order_bump: z.any().optional().transform(() => undefined),
  ```

  ```typescript
  .transform(({ order_bump: _legacyOrderBump, ...rest }) => rest);
  ```

  ```typescript
  it("ignores legacy order_bump fields without failing validation", () => {
    // Confirms order_bump is safely stripped
  });
  ```

### Old Implementation (PricingCta Component)
**File**: `packages/ui/src/sections/PricingCta.tsx`

Contains old order bump UI component (lines 29-251):
```typescript
export type PricingCtaOrderBump = {
  title?: string;
  description?: string;
  price?: string;
  image?: string;
  points?: string[];
  bullets?: string[];
};
```

This was the **previous product page-level order bump display**. Now replaced by:


## Architecture Diagram

```
Product Page (e.g., /instagram-downloader)
    ↓
Click CTA Button → GET /checkout/instagram-downloader
    ↓
Checkout Route Handler
├─ Load product & offer config
├─ Resolve main product price (auto-sync test/live)
├─ Determine optional items defined on the offer and use `price_id` or product `default_price`
├─ If set:
│  ├─ Resolve optional bundle price
│  └─ Add to optionalItems array
└─ Create Stripe Checkout Session
    ├─ line_items: [Main Product]
    ├─ optional_items: [SERP Blocks] ← Added if env var set
    └─ Redirect to Stripe Checkout URL
         ↓
    Stripe Hosted Checkout
    ├─ Display Main Product
    ├─ Display Optional Item (SERP Blocks)
    │  └─ "Add to order" button
    └─ Customer completes payment
         ↓
    Webhook: checkout.session.completed
    ├─ Fetch all line items (main + optional)
    ├─ Create order record
    ├─ Generate licenses
    ├─ Sync with GHL
    └─ Send confirmation
```


## Files Involved

| File | Purpose | Status |
|------|---------|--------|
| `apps/store/app/checkout/[slug]/route.ts` | Main checkout handler | ✅ Complete |
| `apps/store/lib/payments/stripe.ts` | Price resolution & sync | ✅ Complete |
| `apps/store/lib/payments/stripe-webhook/events/checkout-session-completed.ts` | Webhook processing | ✅ Complete |
| `apps/store/lib/products/offer-config.ts` | Offer configuration | ✅ Complete |
| `apps/store/tests/unit/app/checkout-route.test.ts` | Unit tests | ✅ Complete |
| `.env` / Vercel settings | Environment variables | ⏳ Needs configuration |
| `apps/store/lib/products/product-schema.ts` | Legacy cleanup | ✅ Complete |
| `packages/ui/src/sections/PricingCta.tsx` | Old order bump UI | ℹ️ Deprecated but functional |


## Next Steps

1. **Find Stripe price ID** for $97 SERP Blocks product in Stripe Dashboard
2. **Configure optional items in offer/product**
   - Local `.env`
   - Vercel staging environment
   - Vercel production environment (when ready)
3. **Test manually** on staging:
   - Navigate to product
   - Verify optional item appears in checkout
   - Complete test payment
   - Verify both items in Stripe Dashboard
4. **Run validation checks**:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test:unit
   pnpm validate:products
   ```
   
## CI & Migration

We validate optional items on `validate:content`. If a live product defines `optional_items` that reference a repository product without a price id (unless the referenced product is `pre_release`), `validate:content` will fail.

To preview or fix issues automatically, use the migration script:

```
pnpm --filter @apps/store run migrate:remove-invalid-optional-items
pnpm --filter @apps/store run migrate:remove-invalid-optional-items -- --apply
```
5. **Deploy and monitor**
   - Check logs for any `checkout.optional_bundle_price_unavailable` warnings
   - Monitor customer feedback on optional items UX


## Stripe Documentation

Relevant Stripe docs for reference:

