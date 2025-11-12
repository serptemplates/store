# Checkout Flow: What Happens at Each Step

## Complete Request/Response Flow

### 1️⃣ User Clicks "Get it Now" Button

**Location**: Product page (e.g., `/instagram-downloader`)

**What happens**:
- Browser detects click on CTA
- Redirects to: `GET /checkout/instagram-downloader`
- Dub attribution cookie attached if present

---

### 2️⃣ Checkout Route Handler Executes

**Location**: `apps/store/app/checkout/[slug]/route.ts`

**Code flow**:

```typescript
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  // Step 2a: Extract slug from URL
  const { slug } = await context.params;  // slug = "instagram-downloader"

  // Step 2b: Check if product is pre-release (redirect to waitlist if so)
  try {
    const product = getProductData(slug);
    if (product.status === "pre_release") {
      return NextResponse.redirect(waitlistUrl, { status: 302 });
    }
  } catch {}

  // Step 2c: Load offer configuration from product JSON
  const offer = getOfferConfig(slug);
  if (!offer) {
    return json({ error: "Unknown product" }, 404);
  }

  // Step 2d: Extract query params & cookies
  const search = req.nextUrl.searchParams;
  const quantity = coercePositiveInt(search.get("qty"), 1);
  const dubCookie = req.cookies.get("dub_id")?.value ?? null;

  // Step 2e: Build metadata (for GHL, analytics, etc.)
  const metadata: Record<string, string> = {
    product_slug: slug,
    productSlug: slug,
    dubCustomerExternalId: dubId ? `dub_id_${dubId}` : undefined,
    // ... more metadata
  };

  // Step 2f: Resolve main product price
  const resolvedPrice = await resolvePriceForEnvironment({
    id: slug,
    priceId: offer.stripePriceId,
    // ... handles test/live auto-sync
  });
  // Returns: { id: "price_1XXX...", ... }

  // ✅ KEY STEP: Handle Optional Items
  // Step 2g: Check if optional bundle price is configured
  const optionalItems: CheckoutOptionalItem[] = [];
  const optionalBundlePriceId = process.env.STRIPE_OPTIONAL_BUNDLE_PRICE_ID;
  
  if (optionalBundlePriceId) {  // If env var is set
    try {
      // Resolve the optional bundle price
      const optionalBundlePrice = await resolvePriceForEnvironment({
        id: "optional_downloader_bundle",
        priceId: optionalBundlePriceId,  // e.g., "price_1XXX..."
        // Syncs with live product if needed
        syncWithLiveProduct: true,
      });

      // Add to optional items array
      optionalItems.push({
        price: optionalBundlePrice.id,      // e.g., "price_1XXX..."
        quantity: 1,
        adjustable_quantity: {
          enabled: true,
          minimum: 0,
          maximum: 1,
        },
      });
      // Now optionalItems = [{ price: "price_1XXX...", ... }]
    } catch (error) {
      // If price doesn't exist: log warning, continue without optional items
      logger.warn("checkout.optional_bundle_price_unavailable", {
        slug,
        optionalBundlePriceId,
        error: error.message,
      });
      // optionalItems remains []
    }
  }
  // If STRIPE_OPTIONAL_BUNDLE_PRICE_ID not set: optionalItems stays []

  // Step 2h: Build Stripe Checkout Session params
  const params: CheckoutSessionCreateParamsWithOptionalItems = {
    mode: offer.mode,  // "payment" or "subscription"
    allow_promotion_codes: true,
    line_items: [
      {
        price: resolvedPrice.id,           // Main product price ID
        quantity: quantity,                 // Usually 1
        adjustable_quantity: {
          enabled: true,
          minimum: 0,
          maximum: 99,
        },
      },
    ],
    success_url: offer.successUrl,         // Where to redirect after payment
    cancel_url: offer.cancelUrl,           // Where to redirect on cancel
    metadata: metadata,                     // For webhook processing
    consent_collection: {
      terms_of_service: "required",
    },
    customer_creation: "always",
  };

  // Step 2i: Conditionally add optional items to params
  if (optionalItems.length > 0) {
    params.optional_items = optionalItems;  // Add SERP Blocks as optional item
  }
  // Now params might look like:
  // {
  //   mode: "payment",
  //   line_items: [{ price: "price_instagram...", quantity: 1, ... }],
  //   optional_items: [{ price: "price_serp_blocks...", quantity: 1, ... }],
  //   ...
  // }

  // Step 2j: Create Stripe Checkout Session
  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create(params);
    // Returns Stripe session with URL
    
    const url = session.url;  // e.g., "https://checkout.stripe.com/cs_test_1XXX"

    // Step 2k: Redirect to Stripe Checkout
    return NextResponse.redirect(url, { status: 302 });
    // Browser follows redirect to Stripe
  } catch (error) {
    return json({ error: `stripe_session_create_failed: ${error.message}` }, 500);
  }
}
```

**Output**:
- HTTP 302 redirect to Stripe Checkout URL
- OR HTTP 500 with error message if Stripe call fails

---

### 3️⃣ Stripe Hosted Checkout Displays

**Platform**: Stripe's servers

**What customer sees**:

```
┌─────────────────────────────────────┐
│         STRIPE CHECKOUT             │
├─────────────────────────────────────┤
│                                     │
│  Order Summary                      │
│  ────────────────────              │
│                                     │
│  Instagram Downloader      $17.00   │ ← line_items[0]
│                                     │
│  ┌─────────────────────────────┐   │
│  │ SERP Blocks          $97.00  │ ← optional_items[0]
│  │ [ Add to order ]             │
│  └─────────────────────────────┘   │
│                                     │
│  Subtotal:  $17.00                  │
│  (changes to $114.00 if added)      │
│                                     │
│  [Card details form]                │
│  [Pay $17]  or  [Pay $114]         │
│                                     │
└─────────────────────────────────────┘
```

**Customer options**:
1. Click "Add to order" → SERP Blocks added to cart
2. Click "Remove" → SERP Blocks removed from cart (default state)
3. Complete payment with card details

---

### 4️⃣ Payment Processing

**Platform**: Stripe's payment processor

**What Stripe does**:
1. Validates card details
2. If SERP Blocks was added:
   - Creates 2 line items in the payment
   - Charges total: $17 + $97 = $114
3. If SERP Blocks was NOT added:
   - Creates 1 line item
   - Charges: $17
4. Creates checkout session with final state
5. Charges customer's card

---

### 5️⃣ Webhook: checkout.session.completed

**When**: Immediately after successful payment

**Platform**: Your server receives Stripe event

**What happens**:

```typescript
// File: apps/store/lib/payments/stripe-webhook/events/checkout-session-completed.ts

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventId?: string
) {
  // Step 5a: Extract session metadata
  const metadata = normalizeMetadata(session.metadata);

  // Step 5b: Fetch ALL line items from the session
  const stripe = getStripeClient(stripeMode);
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ["data.price.product"],
    limit: 100,  // Gets BOTH main and optional items
  });

  // Step 5c: Process each line item
  for (const item of lineItems.data ?? []) {
    const price = item.price ?? null;
    
    // Extract product slug from metadata or price
    const productSlugs = collectSlugCandidatesFromMetadata(price?.metadata);
    const tagIds = collectTagCandidatesFromMetadata(price?.metadata);

    // If customer added SERP Blocks:
    // - item 1: instagram-downloader, tagIds: ["purchase-instagram"]
    // - item 2: optional_downloader_bundle, tagIds: ["upsell"]
  }

  // Step 5d: Create order record in database
  await upsertOrder({
    stripeSessionId: session.id,
    lineItems: lineItems.data,  // Both items included
    metadata: metadata,
    // ...
  });

  // Step 5e: Generate licenses for each product
  for (const item of lineItems.data ?? []) {
    const productSlug = extractProductSlugFromItem(item);
    
    if (productSlug) {
      const licenseConfig = extractLicenseConfig(metadata, productSlug);
      
      await createLicenseForOrder({
        orderId: order.id,
        productSlug: productSlug,  // Could be "instagram-downloader" or "serp-blocks"
        tier: licenseConfig.tier,
        entitlements: licenseConfig.entitlements,
      });
      // Now customer has license for Instagram Downloader
      // AND license for SERP Blocks (if added)
    }
  }

  // Step 5f: Sync with GoHighLevel (CRM)
  const ghlTagIds = collectTagCandidatesFromMetadata(metadata);
  
  await syncOrderWithGhl({
    contactEmail: session.customer_email,
    tags: ghlTagIds,  // Includes both main product tags and optional item tags
    lineItems: lineItems.data,
  });
  // GHL records the sale with all items purchased

  // Step 5g: Record success
  await updateCheckoutSessionStatus(session.id, "completed");
  await recordWebhookLog(eventId, "checkout_session_completed", "success");
}
```

**Result**:
- ✅ Order created with all line items
- ✅ Licenses generated for each product
- ✅ GHL synced with customer purchase
- ✅ Customer receives confirmation email

---

### 6️⃣ Redirect to Success Page

**Platform**: Stripe → Browser → Your app

**Flow**:
1. After payment completes, Stripe redirects to `success_url`
2. Browser navigates to: `https://apps.serp.co/checkout/success?session_id=cs_test_1XXX`
3. Success page loads and displays order confirmation

---

## Environment Variable Decision Tree

```
Does STRIPE_OPTIONAL_BUNDLE_PRICE_ID exist in env?
│
├─ YES (e.g., "price_1XXX...")
│  │
│  └─ Can Stripe resolve the price?
│     │
│     ├─ YES
│     │  └─ Add to optionalItems array
│     │     └─ Pass to stripe.checkout.sessions.create()
│     │        └─ Stripe Checkout shows optional item UI
│     │           └─ Customer can add/remove
│     │              └─ Webhook processes correctly
│     │
│     └─ NO (404, invalid, etc.)
│        └─ Log warning: "checkout.optional_bundle_price_unavailable"
│           └─ Continue without optional items
│              └─ Main checkout still works
│
└─ NO (not set / undefined)
   └─ optionalItems stays empty []
      └─ Only line_items sent to Stripe
         └─ No optional item appears in checkout
            └─ Normal checkout flow
```

---

## Summary

**The key decision point** is line 118 in `route.ts`:

```typescript
const optionalBundlePriceId = process.env.STRIPE_OPTIONAL_BUNDLE_PRICE_ID;

if (optionalBundlePriceId) {  // ← ONE IF STATEMENT
  // ... resolve price and add to optional_items
}
```

- **If env var exists** → Optional items activated automatically
- **If env var missing** → Optional items disabled (no error)
- **If price can't be resolved** → Graceful degradation (log warning, continue)

No code changes. Just set the environment variable and the feature activates.

