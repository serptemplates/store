import type { ProductData } from '@/lib/products/product-schema';
import { canonicalizeStoreOrigin, canonicalizeStoreHref, getDefaultStoreUrl } from '@/lib/canonical-url';
import { DEFAULT_MERCHANT_RETURN_POLICY } from './return-policy';

const DEFAULT_IMAGE_LICENSE_URL = 'https://github.com/serpapps/legal/blob/main/terms-conditions.md';
const DEFAULT_IMAGE_ACQUIRE_LICENSE_URL = 'https://serp.co/contact';
const DEFAULT_TRANSLATED_LANGUAGES = [
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'it',
  'ja',
  'ko',
  'zh-Hans',
  'zh-Hant',
  'ar',
];

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
  imageLicenseUrl?: string;
  acquireLicensePageUrl?: string;
  translatedLanguages?: string[];
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
  imageLicenseUrl = DEFAULT_IMAGE_LICENSE_URL,
  acquireLicensePageUrl = DEFAULT_IMAGE_ACQUIRE_LICENSE_URL,
  translatedLanguages = DEFAULT_TRANSLATED_LANGUAGES,
}: ProductSchemaLDOptions) {
  const resolvedProductId = productId ?? `${url}#product`;
  const resolvedPrice =
    typeof product.price === 'number'
      ? product.price
      : normalizePriceValue(product.pricing?.price ?? null) ?? 0;

  // Get primary image or use placeholder
  const primaryImage = product.images?.[0] || '/api/og';
  const normalizedStoreUrl = storeUrl.replace(/\/$/, '');
  const normalizeImage = (imagePath: string): string => {
    if (!imagePath) {
      if (/^https?:\/\//i.test(primaryImage)) {
        return primaryImage;
      }
      const fallbackImage = primaryImage.startsWith('/') ? primaryImage : `/${primaryImage}`;
      return `${normalizedStoreUrl}${fallbackImage}`;
    }

    if (/^https?:\/\//i.test(imagePath)) {
      return imagePath;
    }

    const normalizedImage = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${normalizedStoreUrl}${normalizedImage}`;
  };

  const normalizedImageUrls = Array.isArray(product.images)
    ? product.images.map((img) => normalizeImage(img))
    : [normalizeImage(primaryImage)];

  const guessImageMimeType = (imageUrl: string): string | undefined => {
    const base = imageUrl.split(/[?#]/)[0];
    if (!base) return undefined;
    const extension = base.split('.').pop();
    if (!extension) return undefined;
    const ext = extension.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'svg':
        return 'image/svg+xml';
      default:
        return undefined;
    }
  };

  const brandOrganization = {
    '@type': 'Organization' as const,
    name: brandName,
    url: normalizedStoreUrl,
  };

  const imageObjects = normalizedImageUrls.map((imageUrl, index) => {
    const imageId = `${resolvedProductId}-image-${index + 1}`;
    return {
      '@type': 'ImageObject' as const,
      '@id': imageId,
      url: imageUrl,
      contentUrl: imageUrl,
      caption: product.tagline || product.description || product.name,
      creditText: brandName,
      license: imageLicenseUrl,
      acquireLicensePage: acquireLicensePageUrl,
      creator: brandOrganization,
      copyrightHolder: brandOrganization,
      // Avoid non-deterministic year during hydration; omit year to keep SSR/CSR identical
      copyrightNotice: `© ${brandName}. All rights reserved.`,
      representativeOfPage: index === 0,
      fileFormat: guessImageMimeType(imageUrl),
    };
  });

  const availableLanguage = Array.from(
    new Set(
      translatedLanguages
        .map((lang) => lang?.trim())
        .filter((lang): lang is string => Boolean(lang && lang.length > 0)),
    ),
  );

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
    // Use provided review date only; avoid generating a dynamic timestamp
    ...(review.date ? { datePublished: review.date } : {}),
    reviewBody: review.text ?? review.review,
  }));

  // Build offers structure with all required fields
  const offers = {
    '@type': 'Offer',
    url: url,
    priceCurrency: currency,
    price: resolvedPrice,
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
      url: normalizedStoreUrl,
    },
    // Return policy for Google Shopping
    hasMerchantReturnPolicy: DEFAULT_MERCHANT_RETURN_POLICY,
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
    image: imageObjects.length ? imageObjects : normalizedImageUrls,
    primaryImageOfPage: imageObjects.length ? { '@id': imageObjects[0]['@id'] } : undefined,
    associatedMedia: imageObjects.length ? imageObjects : undefined,
    url: url,
    // Brand is required for Google Shopping
    brand: {
      '@type': 'Brand',
      name: brandName,
      url: normalizedStoreUrl,
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
    ...(availableLanguage.length && { availableLanguage }),
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
  storeUrl?: string;
}) {
  const baseStoreUrl = canonicalizeStoreOrigin(storeUrl ?? getDefaultStoreUrl());

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      const itemUrl = canonicalizeStoreHref(item.url, baseStoreUrl);
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        ...(itemUrl && { item: itemUrl }),
      };
    }),
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
    logo: logoUrl || `${storeUrl}/logo.svg`,
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

export interface TranslatedResultsSchemaOptions {
  url: string;
  name: string;
  productId: string;
  storeUrl: string;
  storeName?: string;
  inLanguage?: string;
  availableLanguages?: string[];
}

export function generateTranslatedResultsSchema({
  url,
  name,
  productId,
  storeUrl,
  storeName = 'SERP Apps',
  inLanguage = 'en',
  availableLanguages = DEFAULT_TRANSLATED_LANGUAGES,
}: TranslatedResultsSchemaOptions) {
  const normalizedStoreUrl = storeUrl.replace(/\/$/, '');
  const normalizedAvailableLanguages = Array.from(
    new Set(
      (availableLanguages.length ? availableLanguages : DEFAULT_TRANSLATED_LANGUAGES)
        .map((language) => language?.trim())
        .filter((language): language is string => Boolean(language && language.length > 0)),
    ),
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#translated-results`,
    url,
    name,
    inLanguage,
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${normalizedStoreUrl}#website`,
      name: storeName,
      url: normalizedStoreUrl,
    },
    mainEntity: {
      '@id': productId,
    },
    availableLanguage: normalizedAvailableLanguages,
    potentialAction: {
      '@type': 'ViewAction',
      name: 'View translated page',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: url,
      },
    },
  };
}
