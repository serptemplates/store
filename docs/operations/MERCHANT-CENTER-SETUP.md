# Google Merchant Center & YouTube Shopping Setup Guide

## Prerequisites

1. **Google Account**: Same account that owns your YouTube channel
2. **YouTube Channel**: Must meet ONE of these requirements:
   - 1,000+ subscribers
   - Part of YouTube Shopping Affiliate Program
   - Official Artist Channel
3. **Website**: Verified and claimed domain
4. **Products**: Digital products configured with proper schema markup ✅

## Step 1: Create Google Merchant Center Account

1. Go to [merchants.google.com](https://merchants.google.com)
2. Click "Get started"
3. Enter business information:
   - Business name: Your Store Name
   - Country: United States
   - Time zone: Your timezone
4. Accept terms of service

## Step 2: Verify and Claim Your Website

### Option A: HTML Tag (Easiest)
1. In Merchant Center → Settings → Business information
2. Click "Website" → "Add website"
3. Enter your domain: `https://yourdomain.com`
4. Choose "Add HTML tag"
5. Copy the meta tag
6. Add to your Next.js app:

```tsx
// apps/store/app/layout.tsx
export default function RootLayout() {
  return (
    <html>
      <head>
        {/* Google Merchant Center Verification */}
        <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
      </head>
      ...
    </html>
  );
}
```

7. Click "Verify website"
8. After verification, click "Claim website"

## Step 3: Configure Tax and Shipping

### For Digital Products:
1. Go to Settings → Shipping and returns
2. Create shipping service:
   - Service name: "Digital Delivery"
   - Delivery time: 0-1 days
   - Cost: Free
   - Countries: All countries you sell to

3. Go to Settings → Tax
4. Configure tax settings:
   - For digital products, usually no tax collection needed
   - Consult your tax advisor for specific requirements

## Step 4: Create Product Feed

### Option 1: Manual Upload (Good for <100 products)

Create `products-feed.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Store Product Feed</title>
    <link>https://yourdomain.com</link>
    <description>Product feed for Google Merchant Center</description>

    <item>
      <g:id>demo-ecommerce-product</g:id>
      <g:title>Product Name</g:title>
      <g:description>Product description here</g:description>
      <g:link>https://yourdomain.com/demo-ecommerce-product</g:link>
      <g:image_link>https://yourdomain.com/product-image.jpg</g:image_link>
      <g:availability>in stock</g:availability>
      <g:price>97.00 USD</g:price>
      <g:brand>Your Brand</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>Software</g:google_product_category>
      <g:product_type>Digital Products > Software</g:product_type>

      <!-- Optional but recommended -->
      <g:gtin>1234567890123</g:gtin>
      <g:mpn>PROD-001</g:mpn>
      <g:sale_price>47.00 USD</g:sale_price>
      <g:sale_price_effective_date>2024-01-01T00:00:00Z/2024-12-31T23:59:59Z</g:sale_price_effective_date>
    </item>

    <!-- Add more items -->
  </channel>
</rss>
```

#### CLI helper

We provide a helper script that builds a feed directly from the product catalogue:

```bash
# CSV (default) feed written to merchant-feed.csv
pnpm merchant:export:store -- --format=csv --output=merchant-feed.csv

# XML feed variant
pnpm merchant:export:store -- --format=xml --output=merchant-feed.xml
```

Upload the generated file via Products → Feeds → Upload.

### Option 2: Automated Feed via API Route

Create an API endpoint to generate the feed dynamically:

```typescript
// apps/store/app/api/feeds/google-merchant/route.ts
import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/products/product";

export async function GET() {
  const products = getAllProducts();

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Store Product Feed</title>
    <link>${process.env.NEXT_PUBLIC_SITE_URL}</link>
    <description>Product feed for Google Merchant Center</description>
    ${products.map(product => `
    <item>
      <g:id>${product.slug}</g:id>
      <g:title>${product.name}</g:title>
      <g:description>${product.description}</g:description>
      <g:link>${process.env.NEXT_PUBLIC_SITE_URL}/${product.slug}</g:link>
      <g:image_link>${product.featured_image}</g:image_link>
      <g:availability>in stock</g:availability>
      <g:price>${product.pricing?.price?.replace('$', '')} USD</g:price>
      <g:brand>${product.brand || 'Store'}</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>Software</g:google_product_category>
      <g:product_type>Digital Products > ${product.categories?.[0] || 'Software'}</g:product_type>
      ${product.sku ? `<g:mpn>${product.sku}</g:mpn>` : ''}
    </item>`).join('')}
  </channel>
</rss>`;

  return new NextResponse(feed, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}
```

### Option 3: Content API Upload Script

We also ship a script that pushes products directly into Merchant Center using the Content API. This is useful for backfilling the catalogue or running on-demand syncs.

1. Create a service account in Google Cloud with access to the Content API for Shopping and add it to your Merchant Center account.
2. Export the credentials and set the following environment variables:
   - `GOOGLE_MERCHANT_ACCOUNT_ID` – the numeric Merchant Center ID.
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` – the service account email.
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` – the private key (supporting `\n`-escaped newlines).
   - Optional:
     - `GOOGLE_MERCHANT_COUNTRIES` (comma separated, defaults to `US`).
     - `GOOGLE_MERCHANT_LANGUAGE` (defaults to `en`).
     - `GOOGLE_MERCHANT_SITE_URL` / `GOOGLE_MERCHANT_APPS_URL` to override link targets.
     - `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` (or `GOOGLE_SERVICE_ACCOUNT_KEY_FILE`) to point at a JSON key file if you prefer not to paste credentials into env vars.
3. Run the script from the repo root:

```bash
# Dry run a single product
pnpm run merchant:upload -- --slug=onlyfans-downloader --dry-run

# Upload all products to the configured countries
pnpm run merchant:upload
```

The script reads from `apps/store/data/products/*.yaml`, validates each entry with the shared schema, and inserts them via the Content API. Use `--dry-run` while testing—no requests are dispatched, but the payload summary is printed.

## Step 5: Upload Product Feed

1. In Merchant Center → Products → Feeds
2. Click blue "+" button
3. Select country and language
4. Name your feed: "Primary Feed"
5. Choose upload method:
   - **Scheduled fetch**: Enter URL: `https://yourdomain.com/api/feeds/google-merchant`
   - **Manual upload**: Upload your XML file
6. Set fetch schedule (daily recommended)
7. Click "Create feed"

## Step 6: Connect to YouTube

1. Go to YouTube Studio
2. Navigate to Monetization → Shopping
3. Click "Connect a store"
4. Select "Google Merchant Center"
5. Choose your Merchant Center account
6. Select products to feature

### Configure YouTube Shopping:
1. **Store tab**: Enable store tab on your channel
2. **Product shelf**: Show products below videos
3. **Live shopping**: Feature products during live streams
4. **Shorts shopping**: Add product tags to Shorts

## Step 7: Tag Products in Videos

### In Video Uploads:
1. Upload or edit a video
2. Go to "Details" → "Shopping"
3. Search and select products from your catalog
4. Products will appear as:
   - Shelf below video
   - Tagged timestamps in video
   - Links in description

### Best Practices:
- Tag relevant products only
- Add products at relevant timestamps
- Include product mentions in video script
- Use clear calls-to-action

## Step 8: Monitor Performance

### In Merchant Center:
- Dashboard → Performance: View clicks, impressions
- Products → Diagnostics: Check for errors
- Products → All products: Review product status

### In YouTube Studio:
- Analytics → Revenue → Shopping
- Track:
  - Product clicks
  - Conversion rate
  - Revenue attribution

## Troubleshooting Common Issues

### Issue: "Products not approved"
**Solution**: Check Merchant Center Diagnostics for specific errors:
- Missing required fields (GTIN, brand)
- Image quality issues (minimum 250x250px)
- Price mismatches with website
- Invalid product categories

### Issue: "Website not verified"
**Solution**:
1. Ensure meta tag is in `<head>` section
2. Domain must match exactly (with/without www)
3. No robots.txt blocking Googlebot

### Issue: "Products not showing on YouTube"
**Solution**:
1. Wait 24-48 hours after connection
2. Ensure products are approved in Merchant Center
3. Check YouTube Shopping eligibility
4. Verify channel is monetized

### Issue: "Feed errors"
**Solution**:
- Validate XML syntax
- Ensure all required fields present
- Check image URLs are accessible
- Verify prices match website

## Implementation Checklist

- [ ] Create Merchant Center account
- [ ] Verify and claim website
- [ ] Configure tax and shipping settings
- [ ] Implement product feed endpoint
- [ ] Upload and schedule feed updates
- [ ] Connect Merchant Center to YouTube
- [ ] Enable Shopping features in YouTube Studio
- [ ] Tag products in existing videos
- [ ] Monitor performance metrics
- [ ] Set up alerts for feed errors

## Required Product Data

### Minimum Requirements:
- `id`: Unique product identifier
- `title`: Product name
- `description`: Product description
- `link`: Product page URL
- `image_link`: Main product image
- `availability`: in stock/out of stock
- `price`: Current price
- `brand`: Brand name
- `condition`: new/used/refurbished

### Recommended Additions:
- `gtin`: Global Trade Item Number
- `mpn`: Manufacturer Part Number
- `sale_price`: Discounted price
- `product_type`: Your category taxonomy
- `google_product_category`: Google's taxonomy

## API Implementation Status

✅ **Completed**:
- Product schema markup
- Structured data implementation
- Product data model with required fields

⏳ **Pending**:
- [ ] Create `/api/feeds/google-merchant` endpoint
- [ ] Add GTIN/MPN fields to products
- [ ] Implement feed caching
- [ ] Add feed validation

## Next Steps

1. **Immediate**: Add verification meta tag to layout
2. **Day 1**: Create and upload product feed
3. **Day 2**: Connect to YouTube channel
4. **Week 1**: Tag products in top videos
5. **Ongoing**: Monitor and optimize performance

## Support Resources

- [Merchant Center Help](https://support.google.com/merchants)
- [YouTube Shopping Help](https://support.google.com/youtube/answer/9454088)
- [Product Feed Specifications](https://support.google.com/merchants/answer/7052112)
- [Feed Validator Tool](https://feedvalidator.org)
