import type { ProductData } from '@/lib/product-schema';

/**
 * Generate Product schema.org JSON-LD for Google Shopping eligibility
 * Required fields for Google Shopping:
 * - name, image, description
 * - offers with price and priceCurrency
 * - availability status
 * - seller/brand information
 * - review/rating (recommended)
 * - SKU/GTIN/MPN (recommended for physical products)
 */

// Extended product interface for schema generation
interface SchemaProduct extends Omit<ProductData, 'reviews'> {
  price?: string;
  images?: string[];
  isDigital?: boolean;
  reviews?: Array<{
    name: string;
    review: string;
    rating?: number;
    date?: string;
    text?: string;
  }>;
}

export interface ProductSchemaLDOptions {
  product: SchemaProduct;
  url: string;
  storeUrl: string;
  storeName?: string;
  brandName?: string;
  currency?: string;
  preRelease?: boolean;
  expectedLaunchDate?: string;
}

export function generateProductSchemaLD({
  product,
  url,
  storeUrl,
  storeName = 'SERP Apps',
  brandName = 'SERP Apps',
  currency = 'USD',
  preRelease = false,
  expectedLaunchDate,
}: ProductSchemaLDOptions) {
  // Get primary image or use placeholder
  const primaryImage = product.images?.[0] || '/api/og';

  // Calculate average rating if reviews exist
  const aggregateRating = product.reviews?.length ? {
    '@type': 'AggregateRating',
    ratingValue: product.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / product.reviews.length,
    reviewCount: product.reviews.length,
    bestRating: 5,
    worstRating: 1,
  } : undefined;

  // Individual reviews
  const reviews = product.reviews?.map(review => ({
    '@type': 'Review',
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating || 5,
      bestRating: 5,
      worstRating: 1,
    },
    author: {
      '@type': 'Person',
      name: review.name || 'Verified Buyer',
    },
    datePublished: review.date || new Date().toISOString(),
    reviewBody: review.text,
  }));

  // Build offers structure with all required fields
  const offers = {
    '@type': 'Offer',
    url: url,
    priceCurrency: currency,
    price: product.price || '0.00',
    priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    // Set availability based on pre_release flag
    availability: preRelease
      ? 'https://schema.org/PreOrder'
      : 'https://schema.org/InStock',
    // Add availabilityStarts for pre-release products
    ...(preRelease && expectedLaunchDate && {
      availabilityStarts: expectedLaunchDate,
    }),
    seller: {
      '@type': 'Organization',
      name: storeName,
      url: storeUrl,
    },
    // Return policy for Google Shopping
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'US',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 30,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/FreeReturn',
    },
    // Shipping details (required for physical products, optional for digital)
    shippingDetails: product.isDigital ? {
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: 0,
        currency: currency,
      },
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'US',
      },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: {
          '@type': 'QuantitativeValue',
          minValue: 0,
          maxValue: 0,
          unitCode: 'DAY',
        },
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: 0,
          maxValue: 0,
          unitCode: 'DAY',
        },
      },
    } : undefined,
    // Eligibility for Google Shopping
    itemCondition: 'https://schema.org/NewCondition',
  };

  // Main Product schema
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.tagline || `${product.name} - Download and automation tool`,
    image: Array.isArray(product.images)
      ? product.images.map(img => `${storeUrl}${img}`)
      : [`${storeUrl}${primaryImage}`],
    url: url,
    // Brand is required for Google Shopping
    brand: {
      '@type': 'Brand',
      name: brandName,
    },
    // SKU/identifiers (use slug as SKU for digital products)
    sku: product.slug,
    mpn: product.slug, // Manufacturer Part Number
    // GTIN-13 (optional but recommended) - generate a placeholder
    gtin13: generateGTIN13(product.slug),
    // Category for better classification
    category: product.categories?.join(' > ') || 'Software > Automation Tools',
    // Offer details
    offers: offers,
    // Reviews and ratings
    ...(aggregateRating && { aggregateRating }),
    ...(reviews && reviews.length > 0 && { review: reviews }),
    // Additional product details
    ...(product.keywords && {
      keywords: product.keywords.join(', '),
    }),
    // Product features as additional property
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Platform',
        value: product.platform || 'Web',
      },
      {
        '@type': 'PropertyValue',
        name: 'Product Type',
        value: product.isDigital ? 'Digital Download' : 'Physical Product',
      },
      ...(product.features?.map(feature => ({
        '@type': 'PropertyValue' as const,
        name: 'Feature',
        value: typeof feature === 'string' ? feature : (feature as any).text,
      })) || []),
    ],
    // Software-specific properties if applicable
    ...(product.isDigital && {
      '@type': ['Product', 'SoftwareApplication'],
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web Browser',
      softwareVersion: '1.0',
      offers: {
        ...offers,
        '@type': 'AggregateOffer',
        lowPrice: product.price || '0.00',
        highPrice: product.price || '0.00',
        offerCount: 1,
      },
    }),
  };

  return schema;
}

/**
 * Generate a consistent GTIN-13 from product slug
 * This is a placeholder - in production, use real GTINs
 */
function generateGTIN13(slug: string): string {
  // Create a numeric hash from the slug
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash) + slug.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Ensure positive number and pad to 12 digits
  const base = Math.abs(hash).toString().padEnd(12, '0').slice(0, 12);

  // Calculate check digit (GTIN-13 standard)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  return base + checkDigit;
}

/**
 * Generate BreadcrumbList schema for better navigation context
 */
export function generateBreadcrumbSchema({
  items,
  storeUrl,
}: {
  items: Array<{ name: string; url?: string }>;
  storeUrl: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url && {
        item: `${storeUrl}${item.url}`,
      }),
    })),
  };
}

/**
 * Generate Organization schema for the store
 */
export function generateOrganizationSchema({
  storeName = 'SERP Apps',
  storeUrl,
  logoUrl,
  description = 'Download automation tools and growth apps',
}: {
  storeName?: string;
  storeUrl: string;
  logoUrl?: string;
  description?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: storeName,
    url: storeUrl,
    logo: logoUrl || `${storeUrl}/logo.png`,
    description: description,
    sameAs: [
      'https://github.com/serpapps',
      'https://twitter.com/serpapps',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@apps.serp.co',
      url: `${storeUrl}/support`,
    },
  };
}
