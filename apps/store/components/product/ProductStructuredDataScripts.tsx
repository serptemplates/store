"use client";

import Script from "next/script";

import { generateProductSchemaLD, generateBreadcrumbSchema, type SchemaProduct } from "@/schema/product-schema-ld";
import { generateWebApplicationSchema } from "@/schema/software-app-schema";
import type { ProductData } from "@/lib/products/product-schema";
import type { SiteConfig } from "@/lib/site-config";
import { productToHomeTemplate } from "@/lib/products/product-adapter";
import type { BlogPostMeta } from "@/lib/blog";
import type { ProductVideoEntry } from "@/lib/products/video";

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

  const homeProps = productToHomeTemplate(product, posts);
  const normalizedStoreUrl = (() => {
    if (siteConfig?.site?.domain) {
      const trimmed = siteConfig.site.domain.trim().replace(/\/$/, "");
      return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    }
    return "https://apps.serp.co";
  })();
  const productPath = product.slug?.replace(/^\/+/, "") ?? "";
  const productUrl = productPath ? `${normalizedStoreUrl}/${productPath}` : normalizedStoreUrl;
  const productId = `${productUrl}#product`;
  const resolvedCurrency = product.pricing?.currency?.trim() || "USD";
  const normalizedPrice = parsePrice(product.pricing?.price) ?? "0.00";
  const normalizedImages = images.length
    ? images
    : [product.featured_image, product.featured_image_gif]
        .flat()
        .filter((value): value is string => Boolean(value && value.trim().length > 0));
  const schemaProduct: SchemaProduct = {
    ...product,
    price: normalizedPrice,
    images: normalizedImages,
    isDigital: true,
    reviews: product.reviews?.map((review) => ({
      name: review.name,
      review: review.review,
      rating: review.rating,
      date: review.date,
      text: review.review,
    })),
  };

  const productSchema = generateProductSchemaLD({
    product: schemaProduct,
    url: productUrl,
    storeUrl: normalizedStoreUrl,
    productId,
    currency: resolvedCurrency,
    preRelease: product.pre_release ?? false,
    expectedLaunchDate: undefined,
  });

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: "Home", url: "/" },
      { name: product.name },
    ],
    storeUrl: normalizedStoreUrl,
  });

  const softwareAppSchema = generateWebApplicationSchema({
    name: product.name,
    description: product.description || product.tagline || "",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web Browser",
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
    screenshot:
      product.screenshots?.map((screenshot) =>
        typeof screenshot === "string" ? screenshot : screenshot.url,
      ) ?? normalizedImages,
    softwareVersion: "1.0",
    url: siteConfig?.site?.domain ? `https://${siteConfig.site.domain}/${product.slug}` : `${normalizedStoreUrl}/${product.slug}`,
    downloadUrl: product.purchase_url,
    author: {
      name: siteConfig?.site?.name?.trim() || "SERP Apps",
      url: normalizedStoreUrl,
    },
    datePublished: new Date().toISOString(),
    featureList: product.features?.map((feature) => feature),
    browserRequirements: "Requires a modern web browser with JavaScript enabled",
  });

  const faqScript =
    homeProps.faqs && homeProps.faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
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
  const supportedRegions = product.supported_regions
    .map((region) => region.trim())
    .filter((region) => region.length > 0);
  const primaryRegion = supportedRegions[0] ?? 'Worldwide';

  const videoScripts = videoObjects.map((entry) => {
    const watchUrl = `${baseUrl}${entry.watchPath}`;
    const thumbnailUrl = entry.thumbnailUrl
      ? [entry.thumbnailUrl]
      : images && images.length > 0
      ? images
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
      offers: product.purchase_url
        ? {
            '@type': 'Offer',
            url: product.purchase_url,
            price: normalizedPrice,
            priceCurrency: resolvedCurrency,
            availability: product.pre_release ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock',
          }
        : undefined,
      videoQuality: 'HD',
    };
  });

  return (
    <>
      <Script id="product-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <Script id="breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script id="software-app-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
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
