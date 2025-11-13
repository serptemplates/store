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
  // Step 2g: Build optional items from offer.optionalItems or product.default_price
  const optionalItems: CheckoutOptionalItem[] = [];
  for (const optionalItem of offer.optionalItems ?? []) {
    try {
      const liveStripe = getStripeClient("live");
      const product = await liveStripe.products.retrieve(optionalItem.product_id);
      const priceIdFromOffer = optionalItem.price_id as string | undefined;
      const priceIdToResolve = priceIdFromOffer ?? (typeof product.default_price === "string" ? product.default_price : product.default_price?.id);
      if (!priceIdToResolve) {
        // No per-offer override and the product has no default price; skip optional item
        continue;
      }
      const optionalPrice = await resolvePriceForEnvironment(
        {
          id: optionalItem.product_id,
          priceId: priceIdToResolve,
          productName: product.name,
          productDescription: product.description || undefined,
          productImage: product.images?.[0] || undefined,
        },
        { syncWithLiveProduct: true },
      );
      optionalItems.push({
        price: optionalPrice.id,
        quantity: optionalItem.quantity ?? 1,
        adjustable_quantity: { enabled: true, minimum: 0, maximum: 1 },
      });
    } catch (error) {
      logger.warn("checkout.optional_item_price_unavailable", {
        slug,
        productId: optionalItem.product_id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

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

## Optional Items Decision Tree

```
Determine optional items from `offer.optionalItems` or `product.default_price`:
│
├─ Offer defines optionalItems?
│  ├─ YES → For each optional item:
│  │  ├─ Does optionalItem specify `price_id`? If yes, pick that.
│  │  ├─ Else: does the product have a `default_price`? If yes, use that.
│  │  ├─ Can Stripe resolve this price for the environment?
│  │  │  ├─ YES → Add to optionalItems array → Pass to stripe.checkout.sessions.create()
+│  │  │  └─ NO → Log warning (e.g., `checkout.optional_item_price_unavailable`) and skip item
│  │  └─ Continue to next optional item
│  └─ NO → optionalItems stays empty (no optional items included)
```

---

## Summary

**The key decision point** is whether the offer includes `optionalItems`. The route follows this logic:

```typescript
for (const optionalItem of offer.optionalItems ?? []) {
  // Pick price id: optionalItem.price_id || product.default_price
  // Attempt to resolve price for the environment and add to optionalItems array if successful
}
```

Notes:
- Per-offer `price_id` is preferred — use it to override the optional price for that offer.
- If no override exists, the route will attempt to use `product.default_price`.
- If a price cannot be resolved for an optional item, it is skipped (the main product is still check-out-able).

