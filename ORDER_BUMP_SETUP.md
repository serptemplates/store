# Order Bump Setup Checklist

The optional items (order bump) feature is **fully implemented** in code. Activate it by specifying optional items per-offer or in the product JSON — do not use environment variables for per-product price configuration.

## Quick Summary

Optional items are configured on the offer or in the product JSON. Example (in a product or offer config):

```json
{
   "optional_items": [
      {
         "product_id": "prod_optional_bundle",
         "price_id": "price_live_override_97",
         "quantity": 1
      }
   ]
}
```
Set the `price_id` on the offer for the optional item (preferred). If missing, the route will attempt to use the product's `default_price`.

---

## Step-by-Step Activation

### ✅ Step 1: Find SERP Blocks Stripe Price ID

**Option A: Check existing Stripe Dashboard**
1. Open [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Search for "SERP Blocks" in Products
3. If found: Click into it → Copy the price ID (looks like `price_1XXX...`)
4. If NOT found: Jump to Option B

**Option B: Create a new price in Stripe**
1. Dashboard → Products → Create Product
   - Name: `SERP Blocks`
   - Description: `Optional upsell during checkout`
2. Add pricing:
   - Amount: $9700 (97 dollars)
   - Currency: USD
   - Type: One-time payment
3. Copy the new price ID

---

### ✅ Step 2: Configure optional items on the offer or product

Edit your product JSON or the offer config to include `optional_items`.

If you want to override the price for the optional item, set `price_id` in the offer's optional item config. Otherwise ensure the product has a `default_price` configured in Stripe.

---

### ✅ Step 3: Test locally and on staging
1. Ensure your offer or product JSON contains the expected `optional_items` and price ids.
2. Start the dev server and confirm a checkout session includes the optional items.
3. On staging, ensure the product has a live price id (or the `price_id` override in the offer) and run a test payment.

---

### ✅ Step 4: Test Locally

```bash
# Verify your product JSON or offer config contains the expected `optional_items` and price IDs
pnpm dev
open http://localhost:3000/instagram-downloader
# Click "Get it Now" and verify Stripe Checkout shows the optional item when configured
```

---

### ✅ Step 5: Test on Staging

1. Vercel redeploys automatically
2. Open staging URL: `https://appsserp-xxxxx.vercel.app/instagram-downloader`
3. Click CTA → Verify optional item shows in checkout
4. Complete test payment with card `4242 4242 4242 4242`
5. Check Stripe Dashboard → Verify both items in order:
   - Line item 1: Instagram Downloader ($17)
   - Line item 2: SERP Blocks ($97) ← should only be there if customer added it

---

### ✅ Step 6: Run Validation

Before considering it complete:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm validate:products
```

All should pass with no new warnings/errors.

---

### ✅ Step 7: Deploy to Production (When Ready)
2. Redeploy.

## CI Enforcement & Migration

The repo includes automated validation to protect against misconfigured optional items:

- `pnpm --filter @apps/store run validate:content` will fail if a live product defines `optional_items` that reference a repo product which has no price id (unless the referenced product is `pre_release`).
- Use the migration helper below to see which products would be changed, or to apply the fixes:

```bash
# Dry run (preview changes):
pnpm --filter @apps/store run migrate:remove-invalid-optional-items
# Apply changes (overwrites product JSON files):
pnpm --filter @apps/store run migrate:remove-invalid-optional-items -- --apply
```

This ensures `validate:content` will prevent deployments that could cause optional items to silently disappear in Stripe Checkout due to missing price IDs.
   - Using Vercel CLI: `vercel env rm STRIPE_OPTIONAL_BUNDLE_PRICE_ID production` (repeat for preview/staging as needed).

---

## What Happens Behind the Scenes

When customer goes through checkout:

1. **Load product page** → `/instagram-downloader`
2. **Click CTA button** → GET `/checkout/instagram-downloader`
3. **Checkout route determines optional items** from `offer.optionalItems` or the product's `default_price` (no env var).
4. **Resolves price** (auto-syncs live→test if needed)
5. **Creates Stripe session** with both line items:
   - Main: Instagram Downloader
   - Optional: SERP Blocks (from env var)
6. **Stripe hosted checkout shows** "Add to order" button for SERP Blocks
7. **Customer can add/remove** SERP Blocks before paying
8. **Upon payment success**:
   - Webhook fires `checkout.session.completed`
   - Both line items processed (if customer added SERP Blocks)
   - Licenses generated
   - Order created in database
   - GHL sync triggered

---

## Code Reference

All the heavy lifting is already implemented:

- **Checkout handler**: `apps/store/app/checkout/[slug]/route.ts` (lines 116-141)
- **Session creation**: Same file (lines 147-167)
- **Webhook processing**: `apps/store/lib/payments/stripe-webhook/events/checkout-session-completed.ts`
- **Unit tests**: `apps/store/tests/unit/app/checkout-route.test.ts`

No code changes needed. Just the environment variable.

---

## Troubleshooting

### Optional item not showing in checkout

1. **Check that the offer or product JSON defines the optional item**:
   - Confirm `offer.optionalItems` exists and contains the expected `product_id` and (optionally) `price_id`.
   - If using product-level configuration, confirm the product has a `default_price` set in Stripe.

2. **Check if price exists in Stripe**:
   - Go to Stripe Dashboard
   - Search the price ID
   - Should show SERP Blocks product

3. **Check logs**:
   - If price unavailable, you'll see warning: `checkout.optional_item_price_unavailable`
   - Main checkout still works (graceful degradation)

### Test payment not including optional item

- Make sure you clicked "Add to order" before completing payment
- Optional items default to NOT selected (customer must add)

### Production vs staging prices

Use different price IDs:
- **Staging**: Test mode price (`price_test_XXX`)
- **Production**: Live mode price (`price_live_XXX`)

The code automatically handles sync between modes.

---

## Questions?

Refer to:
- `CHECKOUT_OPTIONAL_ITEMS_ARCHITECTURE.md` - Full technical details
- Stripe docs: https://docs.stripe.com/payments/checkout/optional-items
