import type { ProductData } from '@/lib/products/product-schema';

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
export interface SchemaProduct extends Omit<ProductData, 'reviews'> {
  price?: number | null;
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

const normalizePriceValue = (value?: string | null): number | null => {
  if (value == null) return null;
  const cleaned = value.toString().replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const numeric = Number.parseFloat(cleaned);
  if (!Number.isFinite(numeric)) return null;
  return Number(numeric.toFixed(2));
};

const collectProductImages = (product: ProductData, provided?: string[]): string[] | undefined => {
  const candidates = [
    ...(provided ?? []),
    product.featured_image,
    product.featured_image_gif,
    ...(product.screenshots?.map((shot) => (typeof shot === 'string' ? shot : shot.url)) ?? []),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());

  if (!candidates.length) {
    return undefined;
  }

  return Array.from(new Set(candidates));
};

export interface SchemaProductTransformOptions {
  price?: string | null;
  images?: string[];
  isDigital?: boolean;
}

export function createSchemaProduct(
  product: ProductData,
  { price, images, isDigital = true }: SchemaProductTransformOptions = {},
): SchemaProduct {
  const { reviews, ...rest } = product;
  const normalizedPrice = normalizePriceValue(price ?? product.pricing?.price) ?? null;
  const normalizedImages = collectProductImages(product, images);

  const reviewsWithRatings =
    reviews
      ?.filter(
        (review): review is typeof review & { rating: number } =>
          typeof review.rating === 'number' && Number.isFinite(review.rating),
      )
      .map((review) => ({
        name: review.name,
        review: review.review,
        rating: review.rating,
        date: review.date,
        text: review.review,
      })) ?? [];

  return {
    ...rest,
    price: normalizedPrice,
    images: normalizedImages,
    isDigital,
    reviews: reviewsWithRatings.length ? reviewsWithRatings : undefined,
  };
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
  productId?: string;
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
  productId,
}: ProductSchemaLDOptions) {
  const resolvedProductId = productId ?? `${url}#product`;
  const resolvedPrice =
    typeof product.price === 'number'
      ? product.price
      : normalizePriceValue(product.pricing?.price ?? null) ?? 0;

  // Get primary image or use placeholder
  const primaryImage = product.images?.[0] || '/api/og';
  const normalizeImage = (imagePath: string): string => {
    if (!imagePath) {
      return `${storeUrl}${primaryImage}`;
    }

    if (/^https?:\/\//i.test(imagePath)) {
      return imagePath;
    }

    const normalizedStoreUrl = storeUrl.replace(/\/$/, '');
    const normalizedImage = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${normalizedStoreUrl}${normalizedImage}`;
  };

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
      ratingValue: typeof review.rating === 'number' ? review.rating : 5,
      bestRating: 5,
      worstRating: 1,
    },
    author: {
      '@type': 'Person',
      name: review.name || 'Verified Buyer',
    },
    datePublished: review.date || new Date().toISOString(),
    reviewBody: review.text ?? review.review,
  }));

  // Build offers structure with all required fields
  const offers = {
    '@type': 'Offer',
    url: url,
    priceCurrency: currency,
    price: resolvedPrice,
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
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: resolvedPrice,
      priceCurrency: currency,
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
    '@type': product.isDigital ? ['Product', 'SoftwareApplication'] : 'Product',
    '@id': resolvedProductId,
    name: product.name,
    description: product.description || product.tagline || `${product.name} - Download and automation tool`,
    image: Array.isArray(product.images)
      ? product.images.map(img => normalizeImage(img))
      : [normalizeImage(primaryImage)],
    url: url,
    // Brand is required for Google Shopping
    brand: {
      '@type': 'Brand',
      name: brandName,
    },
    // SKU/identifiers (use slug as SKU for digital products)
    sku: product.slug,
    mpn: product.slug, // Manufacturer Part Number
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
        value: feature,
      })) || []),
    ],
    // Software-specific properties if applicable
    ...(product.isDigital && {
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web Browser',
      softwareVersion: '1.0',
    }),
  };

  return schema;
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
