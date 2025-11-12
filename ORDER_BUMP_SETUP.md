# Order Bump Setup Checklist

The optional items (order bump) feature is **fully implemented** in code. Just need to activate it with one environment variable.

## Quick Summary

```
STRIPE_OPTIONAL_BUNDLE_PRICE_ID=price_1XXX...
```

Set this variable → Feature activates immediately. No code changes needed.

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

### ✅ Step 2: Add to Local .env

Open `.env` (or create if missing) in repo root:

```bash
STRIPE_OPTIONAL_BUNDLE_PRICE_ID=price_XXXXXXXXXXXXXXXX
```

Replace `price_XXXXXXXXXXXXXXXX` with actual price ID from Step 1.

---

### ✅ Step 3: Add to Vercel (Staging)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Settings → Environment Variables
4. Click "Add New"
   - **Name**: `STRIPE_OPTIONAL_BUNDLE_PRICE_ID`
   - **Value**: `price_XXXXXXXXXXXXXXXX` (from Step 1)
   - **Environments**: Select "Preview" (or staging deployment)
5. Click Save

---

### ✅ Step 4: Test Locally

```bash
# Make sure .env has the variable from Step 2
cat .env | grep STRIPE_OPTIONAL

# Start dev server
pnpm dev

# Open product page
open http://localhost:3000/instagram-downloader

# Click "Get it Now"
# Look for "SERP Blocks $97" as optional item in Stripe Checkout
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

1. Add same environment variable to Vercel production environment
   - **Name**: `STRIPE_OPTIONAL_BUNDLE_PRICE_ID`
   - **Value**: `price_XXXXXXXXXXXXXXXX` (use LIVE Stripe price ID, not test)
   - **Environments**: Production
2. Redeploy

---

## What Happens Behind the Scenes

When customer goes through checkout:

1. **Load product page** → `/instagram-downloader`
2. **Click CTA button** → GET `/checkout/instagram-downloader`
3. **Checkout route reads env var** → `STRIPE_OPTIONAL_BUNDLE_PRICE_ID`
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

1. **Check if env var is set**:
   ```bash
   echo $STRIPE_OPTIONAL_BUNDLE_PRICE_ID
   ```
   Should output: `price_1XXX...`

2. **Check if price exists in Stripe**:
   - Go to Stripe Dashboard
   - Search the price ID
   - Should show SERP Blocks product

3. **Check logs**:
   - If price unavailable, you'll see warning: `checkout.optional_bundle_price_unavailable`
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
