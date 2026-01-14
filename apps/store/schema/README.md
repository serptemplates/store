# Schema.org Structured Data

This folder contains all Schema.org structured data implementations for SEO, Google Shopping eligibility, and rich results.

## 📁 File Structure

```
schema/
├── index.ts                     # Main exports
├── types.ts                     # TypeScript type definitions
├── product-schema-ld.ts         # Product schema generation functions
├── structured-data-components.tsx # React components for schemas
├── test-schema-markup.ts        # Testing and validation script
└── README.md                    # This file
```

## 🎯 Implemented Rich Result Types

### ✅ Google Shopping Required
- **Product** - Full product details with pricing, availability, and identifiers
- **Merchant Listings** - Via Product schema with merchant return policy
- **Review Snippets** - Aggregate ratings and individual reviews

### ✅ Search Enhancements
- **Breadcrumbs** - Navigation paths on all pages
- **FAQs** - Frequently asked questions on product pages
- **Videos** - Product demonstration videos
- **Organization** - Brand identity on homepage
- **WebSite** - Site search functionality
- **CollectionPage** - Product catalog pages
- **Image Metadata** - Enhanced image information

## 🚀 Usage

### Import Schema Functions

```typescript
import {
  createSchemaProduct,
  generateProductSchemaLD,
  generateBreadcrumbSchema,
  generateOrganizationSchema
} from '@/schema';
```

### Generate Product Schema

```typescript
const productSchema = generateProductSchemaLD({
  product: createSchemaProduct(productData, {
    price: productData.pricing?.price,
    images: ['/image1.jpg', '/image2.jpg'],
    isDigital: true,
  }),
  url: 'https://yoursite.com/product',
  storeUrl: 'https://yoursite.com',
  currency: 'USD',
});
```

### Add to Pages

```tsx
import Script from 'next/script';

<Script
  id="product-schema"
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(productSchema),
  }}
/>
```

## 🧪 Testing

Run the test script to validate all schemas:

```bash
npx tsx schema/test-schema-markup.ts
```

### Google Rich Results Test

1. Copy the JSON-LD output from any page
2. Visit: https://search.google.com/test/rich-results
3. Paste the URL or code to test
4. Check for eligibility warnings/errors

### Google Search Console Monitoring

After deployment, monitor performance in Search Console:

- **Shopping** → Product snippets
- **Shopping** → Merchant listings
- **Enhancements** → Breadcrumbs
- **Enhancements** → FAQs
- **Enhancements** → Review snippets
- **Enhancements** → Videos

## 📋 Schema Requirements

### Google Shopping (Product)

**Required Fields:**
- name
- image (URL or array of URLs)
- description
- offers.price
- offers.priceCurrency
- offers.availability
- brand.name

**Recommended Fields:**
- sku
- mpn
- offers.priceSpecification
- aggregateRating
- review
- offers.hasMerchantReturnPolicy

**Return Policy**
- Merchant return policy values are centralized in `apps/store/schema/return-policy.ts` and applied to every product schema.
- offers.shippingDetails

### Breadcrumbs

**Required Fields:**
- itemListElement (array)
- position (for each item)
- name (for each item)

### FAQ

**Required Fields:**
- mainEntity (array of questions)
- name (question text)
- acceptedAnswer.text

### Organization

**Required Fields:**
- name
- url
- logo

**Recommended Fields:**
- description
- sameAs (social media links)
- contactPoint

## 🔧 Customization

### Adding New Schema Types

1. Add type definitions in `types.ts`
2. Create generation function in appropriate file
3. Export from `index.ts`
4. Add tests in `test-schema-markup.ts`

### Extending Product Schema

Edit `product-schema-ld.ts` to add custom fields:

```typescript
// Add to ProductSchemaLDOptions interface
customField?: string;

// Use in generateProductSchemaLD function
...(customField && { customProperty: customField })
```

## 📚 Resources

- [Schema.org Documentation](https://schema.org/)
- [Google Structured Data Guidelines](https://developers.google.com/search/docs/advanced/structured-data/intro-structured-data)
- [Google Merchant Center Requirements](https://support.google.com/merchants/answer/7052112)
- [Rich Results Test Tool](https://search.google.com/test/rich-results)
- [Schema Markup Validator](https://validator.schema.org/)
