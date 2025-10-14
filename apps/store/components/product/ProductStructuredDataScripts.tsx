"use client";

import Script from "next/script";

import { generateProductSchemaLD, generateBreadcrumbSchema, createSchemaProduct, generateTranslatedResultsSchema } from "@/schema";
import { generateWebApplicationSchema, type SoftwareApplicationOptions } from "@/schema/software-app-schema";
import type { ProductData } from "@/lib/products/product-schema";
import { isPreRelease } from "@/lib/products/release-status";
import type { SiteConfig } from "@/lib/site-config";
import { productToHomeTemplate } from "@/lib/products/product-adapter";
import type { BlogPostMeta } from "@/lib/blog";
import type { ProductVideoEntry } from "@/lib/products/video";

const TRANSLATED_RESULTS_LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "it",
  "ja",
  "ko",
  "zh-Hans",
  "zh-Hant",
  "ar",
];

const APPLICATION_CATEGORY_MAP: Record<string, SoftwareApplicationOptions["applicationCategory"]> = {
  downloader: "UtilitiesApplication",
  automation: "BusinessApplication",
  social: "SocialNetworkingApplication",
  education: "EducationalApplication",
  productivity: "BusinessApplication",
  marketing: "BusinessApplication",
  video: "MultimediaApplication",
  analytics: "BusinessApplication",
};

const resolveApplicationCategory = (categories: string[] = []): SoftwareApplicationOptions["applicationCategory"] => {
  for (const category of categories) {
    const key = category.trim().toLowerCase();
    if (key && APPLICATION_CATEGORY_MAP[key]) {
      return APPLICATION_CATEGORY_MAP[key];
    }
  }
  return "UtilitiesApplication";
};

const resolveOperatingSystems = (supported: string[] = []): string[] => {
  const canonical = supported
    .map((system) => system.trim())
    .filter((system) => system.length > 0);

  if (canonical.length === 0) {
    return ["Web Browser"];
  }

  return Array.from(new Set(canonical));
};

const toAbsoluteUrl = (value: string, base: string): string => {
  if (!value) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${normalizedBase}${normalizedPath}`;
};

export interface ProductStructuredDataScriptsProps {
  product: ProductData;
  posts?: BlogPostMeta[];
  siteConfig?: SiteConfig;
  images: string[];
  videoEntries?: ProductVideoEntry[];
}

export function ProductStructuredDataScripts({ product, posts = [], siteConfig, images, videoEntries }: ProductStructuredDataScriptsProps) {
  const parsePrice = (value?: string | null): string | null => {
    if (!value) return null;
    const cleaned = value.toString().replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const numeric = Number.parseFloat(cleaned);
    if (!Number.isFinite(numeric)) return null;
    return numeric.toFixed(2);
  };

  const productIsPreRelease = isPreRelease(product);
  const homeProps = productToHomeTemplate(product, posts);
  const normalizedStoreUrl = (() => {
    if (siteConfig?.site?.domain) {
      const trimmed = siteConfig.site.domain.trim().replace(/\/$/, "");
      return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    }
    return "https://apps.serp.co";
  })();
  const productPath = product.slug?.replace(/^\/+/, "") ?? "";
  const productRelativeUrl = productPath ? `/${productPath}` : "/";
  const productUrl = productPath ? `${normalizedStoreUrl}/${productPath}` : normalizedStoreUrl;
  const productId = `${productUrl}#product`;
  const resolvedCurrency = product.pricing?.currency?.trim() || "USD";
  const normalizedPrice = parsePrice(product.pricing?.price) ?? "0.00";
  const normalizedImages = Array.from(
    new Set(
      (images.length
        ? images
        : [product.featured_image, product.featured_image_gif].flat())
        .filter((value): value is string => Boolean(value && value.trim().length > 0))
        .map((value) => value.trim()),
    ),
  );
  const supportedRegions = (product.supported_regions ?? [])
    .map((region) => region.trim())
    .filter((region) => region.length > 0);
  const schemaProduct = createSchemaProduct(product, {
    price: normalizedPrice,
    images: normalizedImages,
    isDigital: true,
  });

  const applicationCategory = resolveApplicationCategory(product.categories ?? []);
  const operatingSystems = resolveOperatingSystems(product.supported_operating_systems ?? []);
  const screenshotImages = Array.from(
    new Set(
      (product.screenshots?.map((screenshot) =>
        typeof screenshot === "string" ? screenshot : screenshot.url,
      ) ?? normalizedImages)
        .filter((value): value is string => Boolean(value && value.trim().length > 0))
        .map((value) => toAbsoluteUrl(value, normalizedStoreUrl)),
    ),
  );

  const productSchema = generateProductSchemaLD({
    product: schemaProduct,
    url: productUrl,
    storeUrl: normalizedStoreUrl,
    productId,
    currency: resolvedCurrency,
    preRelease: productIsPreRelease,
    expectedLaunchDate: undefined,
    translatedLanguages: TRANSLATED_RESULTS_LANGUAGES,
  });

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: "Home", url: "/" },
      { name: product.name, url: productRelativeUrl },
    ],
    storeUrl: normalizedStoreUrl,
  });

  const permissionSummary = product.permission_justifications
    ?.map((entry) => entry.permission.trim())
    .filter((value) => value.length > 0);

  const softwareAppSchema = {
    ...generateWebApplicationSchema({
      name: product.name,
      description: product.description || product.tagline || "",
      applicationCategory,
      operatingSystem: operatingSystems,
      offers: {
        price: normalizedPrice,
        priceCurrency: resolvedCurrency,
      },
      aggregateRating:
        product.reviews && product.reviews.length > 0
          ? {
              ratingValue:
                product.reviews.reduce((sum, review) => sum + (typeof review.rating === "number" ? review.rating : 5), 0) /
                product.reviews.length,
              ratingCount: product.reviews.length,
              bestRating: 5,
              worstRating: 1,
            }
          : undefined,
      screenshot: screenshotImages,
      softwareVersion: "1.0",
      url: productUrl,
      downloadUrl:
        product.serply_link ?? product.apps_serp_co_product_page_url ?? product.store_serp_co_product_page_url ?? productUrl,
      author: {
        name: siteConfig?.site?.name?.trim() || "SERP Apps",
        url: normalizedStoreUrl,
      },
      featureList: product.features?.map((feature) => feature),
      browserRequirements: "Requires a modern web browser with JavaScript enabled",
      countriesSupported: supportedRegions.length ? supportedRegions : undefined,
      applicationSubCategory: product.categories?.join(" / "),
      permissions: permissionSummary && permissionSummary.length > 0 ? permissionSummary : undefined,
    }),
    '@id': `${productId}-software`,
  } as ReturnType<typeof generateWebApplicationSchema> & { '@id': string };

  if (softwareAppSchema.offers && typeof softwareAppSchema.offers === "object") {
    Object.assign(softwareAppSchema.offers as Record<string, unknown>, {
      url: productUrl,
      availability: productIsPreRelease ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
    });
  }

  const faqScript =
    homeProps.faqs && homeProps.faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          '@id': `${productUrl}#faq`,
          mainEntityOfPage: {
            '@id': productId,
          },
          mainEntity: homeProps.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        }
      : null;

  const baseUrl = normalizedStoreUrl;

  const videoObjects = videoEntries ?? [];
  const primaryRegion = supportedRegions[0] ?? 'Worldwide';

  const videoScripts = videoObjects.map((entry) => {
    const watchUrl = `${baseUrl}${entry.watchPath}`;
    const thumbnail = entry.thumbnailUrl ? toAbsoluteUrl(entry.thumbnailUrl, normalizedStoreUrl) : undefined;
    const thumbnailUrl = thumbnail
      ? [thumbnail]
      : screenshotImages.length > 0
      ? screenshotImages
      : undefined;

    return {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: entry.title,
      description: entry.description,
      thumbnailUrl,
      uploadDate: entry.uploadDate,
      duration: entry.duration,
      contentUrl: entry.url,
      embedUrl: entry.embedUrl,
      url: watchUrl,
      mainEntityOfPage: watchUrl,
      inLanguage: 'en-US',
      isFamilyFriendly: true,
      requiresSubscription: false,
      sameAs: Array.from(
        new Set(
          [entry.url, productUrl].filter(
            (value): value is string => typeof value === 'string' && value.length > 0,
          ),
        ),
      ),
      regionsAllowed: supportedRegions.length ? supportedRegions : [primaryRegion],
      contentLocation: {
        '@type': 'Place',
        name: primaryRegion,
      },
      potentialAction: {
        '@type': 'WatchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${baseUrl}${entry.watchPath}`,
        },
      },
      isPartOf: {
        '@id': productId,
      },
      offers: product.serply_link
        ? {
            '@type': 'Offer',
            url: product.serply_link,
            price: normalizedPrice,
            priceCurrency: resolvedCurrency,
            availability: productIsPreRelease ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock',
          }
        : undefined,
      videoQuality: 'HD',
    };
  });

  const translatedResultsSchema = generateTranslatedResultsSchema({
    url: productUrl,
    name: product.name,
    productId,
    storeUrl: normalizedStoreUrl,
    storeName: siteConfig?.site?.name?.trim() || "SERP Apps",
    availableLanguages: TRANSLATED_RESULTS_LANGUAGES,
  });

  return (
    <>
      <Script id="product-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <Script id="breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script id="software-app-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <Script
        id="translated-results-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(translatedResultsSchema) }}
      />
      {faqScript && (
        <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqScript) }} />
      )}
      {videoScripts.map((schema, index) => (
        <Script
          key={`video-schema-${index}`}
          id={`video-schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
