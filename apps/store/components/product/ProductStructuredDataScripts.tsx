"use client";

import Script from "next/script";

import { generateProductSchemaLD, generateBreadcrumbSchema } from "@/schema/product-schema-ld";
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
  const homeProps = productToHomeTemplate(product, posts);
  const productSchema = generateProductSchemaLD({
    product: {
      ...product,
      price: product.pricing?.price?.replace(/[^0-9.]/g, "") || "0",
      images,
      isDigital: true,
      reviews: product.reviews?.map((review) => ({
        ...review,
        rating: (review as any).rating,
        date: (review as any).date,
        text: review.review,
      })),
    } as any,
    url: siteConfig?.site?.domain ? `https://${siteConfig.site.domain}/${product.slug}` : `https://apps.serp.co/${product.slug}`,
    storeUrl: siteConfig?.site?.domain ? `https://${siteConfig.site.domain}` : "https://apps.serp.co",
    currency: "USD",
    preRelease: product.pre_release ?? false,
    expectedLaunchDate: undefined,
  });

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: "Home", url: "/" },
      { name: product.name },
    ],
    storeUrl: siteConfig?.site?.domain ? `https://${siteConfig.site.domain}` : "https://apps.serp.co",
  });

  const softwareAppSchema = generateWebApplicationSchema({
    name: product.name,
    description: product.description || product.tagline || "",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web Browser",
    offers: {
      price: product.pricing?.price?.replace(/[^0-9.]/g, "") || "0",
      priceCurrency: "USD",
    },
    aggregateRating:
      product.reviews && product.reviews.length > 0
        ? {
            ratingValue:
              product.reviews.reduce((sum, review) => sum + ((review as any).rating || 5), 0) /
              product.reviews.length,
            ratingCount: product.reviews.length,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    screenshot: product.screenshots?.map((screenshot) =>
      typeof screenshot === "string" ? screenshot : screenshot.url,
    ) ?? images,
    softwareVersion: "1.0",
    url: siteConfig?.site?.domain ? `https://${siteConfig.site.domain}/${product.slug}` : `https://apps.serp.co/${product.slug}`,
    downloadUrl: product.purchase_url,
    author: {
      name: "SERP Apps",
      url: "https://apps.serp.co",
    },
    datePublished: new Date().toISOString(),
    featureList: product.features?.map((feature) =>
      typeof feature === "string" ? feature : (feature as any).text ?? (feature as any).title,
    ),
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

  const baseUrl = siteConfig?.site?.domain
    ? siteConfig.site.domain.startsWith('http')
      ? siteConfig.site.domain.replace(/\/$/, '')
      : `https://${siteConfig.site.domain.replace(/\/$/, '')}`
    : typeof window !== 'undefined'
      ? window.location.origin
      : 'https://apps.serp.co';

  const videoObjects = videoEntries ?? [];
  const supportedRegions = Array.isArray((product as any).supported_regions)
    ? (product as any).supported_regions.filter((region: unknown): region is string => typeof region === 'string' && region.trim().length > 0)
    : [];
  const primaryRegion = supportedRegions[0] ?? 'Worldwide';

  const videoScripts = videoObjects.map((entry) => {
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
      url: `${baseUrl}${entry.watchPath}`,
      mainEntityOfPage: `${baseUrl}${entry.watchPath}`,
      inLanguage: 'en-US',
      isFamilyFriendly: true,
      requiresSubscription: false,
      sameAs: [entry.url, `${baseUrl}/${product.slug}`].filter(Boolean),
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
        '@type': 'Product',
        name: product.name,
        url: `${baseUrl}/${product.slug}`,
      },
      offers: product.purchase_url
        ? {
            '@type': 'Offer',
            url: product.purchase_url,
            price: product.pricing?.price?.replace(/[^0-9.]/g, '') || '0',
            priceCurrency: 'USD',
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
