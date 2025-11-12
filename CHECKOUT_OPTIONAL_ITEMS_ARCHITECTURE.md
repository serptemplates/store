# Checkout Optional Items Architecture

## Overview

The optional items (order bump) feature is **fully implemented** in the codebase. It allows customers to add complementary products during Stripe Checkout using Stripe's native `optional_items` feature.

**Status**: Ready for activation with a single environment variable.

---

## How It Works

### 1. Checkout Route Handler
**File**: `apps/store/app/checkout/[slug]/route.ts`

The GET endpoint that creates Stripe Checkout Sessions reads `STRIPE_OPTIONAL_BUNDLE_PRICE_ID`:

```typescript
const optionalItems: CheckoutOptionalItem[] = [];
const optionalBundlePriceId = process.env.STRIPE_OPTIONAL_BUNDLE_PRICE_ID;

if (optionalBundlePriceId) {
  try {
    const optionalBundlePrice = await resolvePriceForEnvironment(
      {
        id: "optional_downloader_bundle",
        priceId: optionalBundlePriceId,
      },
      { syncWithLiveProduct: true },
    );

    optionalItems.push({
      price: optionalBundlePrice.id,
      quantity: 1,
      adjustable_quantity: {
        enabled: true,
        minimum: 0,
        maximum: 1,
      },
    });
  } catch (error) {
    logger.warn("checkout.optional_bundle_price_unavailable", {
      slug,
      optionalBundlePriceId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
```

**Key behaviors**:
- Reads env var `STRIPE_OPTIONAL_BUNDLE_PRICE_ID`
- If set, resolves the price using `resolvePriceForEnvironment()` (handles test/live auto-sync)
- Adds it to the checkout session with quantity=1 and adjustable_quantity enabled (min: 0, max: 1)
- Graceful error handling: logs warning if price unavailable, continues without failing

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
- Displays optional items as "Add to order" UI elements
- Allows customers to add/remove without affecting main purchase
- Includes in the final invoice/receipt

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
- Fetches ALL line items from completed session (includes optional items)
- Expands price and product metadata
- Collects tags and product slugs from both main product and any optional items
- Passes to downstream systems (GHL, license creation, order records)

### 5. Order & License Processing

After checkout completion, the order handler:
- Creates database records with all line items
- Generates licenses for applicable products
- Syncs with GoHighLevel (GHL) for sales ops
- Records metadata for analytics

The system treats optional items as regular line items in the fulfillment pipeline.

---

## Environment Variable Configuration

### Required Variable
```
STRIPE_OPTIONAL_BUNDLE_PRICE_ID=price_1XXX...
```

### Where to Set

**Local development** (`.env`):
```bash
STRIPE_OPTIONAL_BUNDLE_PRICE_ID=price_test_xxxxx
```

**Vercel staging** (Environment Variables section):
1. Open project settings in Vercel dashboard
2. Go to Environment Variables
3. Add new variable:
   - Name: `STRIPE_OPTIONAL_BUNDLE_PRICE_ID`
   - Value: The Stripe price ID (format: `price_1XXX...`)
   - Environments: Staging (or whatever deployment)

**Vercel production** (same process, different environment):
```
STRIPE_OPTIONAL_BUNDLE_PRICE_ID=price_live_xxxxx
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

---

## Testing

### Unit Tests
**File**: `apps/store/tests/unit/app/checkout-route.test.ts`

Test case "injects Dub attribution metadata and redirects to Stripe" verifies:
- Optional items are included in session params
- Price is resolved correctly for test/live environments
- Adjustable quantity constraints are applied

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

---

## Error Handling

### If Optional Price Unavailable

If `STRIPE_OPTIONAL_BUNDLE_PRICE_ID` is set but the price doesn't exist:

```typescript
} catch (error) {
  logger.warn("checkout.optional_bundle_price_unavailable", {
    slug,
    optionalBundlePriceId,
    error: error instanceof Error ? error.message : String(error),
  });
}
```

**Behavior**:
- Logs warning to observability (not an error)
- Continues with checkout WITHOUT optional items
- Main purchase still completes successfully
- User doesn't see the optional item but checkout isn't blocked

This graceful degradation ensures checkout never breaks due to optional items misconfiguration.

---

## Legacy Code Cleanup

### Deprecated Fields
The `order_bump` field in product JSON is **legacy and ignored**:

- **File**: `apps/store/lib/products/product-schema.ts` (line 394)
  ```typescript
  order_bump: z.any().optional().transform(() => undefined),
  ```

- **Cleanup in schema transform** (line 611):
  ```typescript
  .transform(({ order_bump: _legacyOrderBump, ...rest }) => rest);
  ```

- **Test verification**: `apps/store/tests/unit/lib/product-schema.test.ts`
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
- Stripe's native optional items in hosted checkout
- No UI component needed on product pages
- Configuration in Stripe Dashboard instead of code

---

## Architecture Diagram

```
Product Page (e.g., /instagram-downloader)
    ↓
Click CTA Button → GET /checkout/instagram-downloader
    ↓
Checkout Route Handler
├─ Load product & offer config
├─ Resolve main product price (auto-sync test/live)
├─ Read STRIPE_OPTIONAL_BUNDLE_PRICE_ID env var
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

---

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

---

## Next Steps

1. **Find Stripe price ID** for $97 SERP Blocks product in Stripe Dashboard
2. **Set environment variable** `STRIPE_OPTIONAL_BUNDLE_PRICE_ID` in:
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
5. **Deploy and monitor**
   - Check logs for any `checkout.optional_bundle_price_unavailable` warnings
   - Monitor customer feedback on optional items UX

---

## Stripe Documentation

Relevant Stripe docs for reference:
- [Stripe Checkout Optional Items](https://docs.stripe.com/payments/checkout/optional-items)
- [Stripe Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions)
- [Stripe Line Items](https://docs.stripe.com/api/checkout/sessions/line_items)

