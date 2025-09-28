"use client";

import Script from "next/script";

import { generateProductSchemaLD, generateBreadcrumbSchema } from "@/schema/product-schema-ld";
import { generateWebApplicationSchema } from "@/schema/software-app-schema";
import type { ProductData } from "@/lib/product-schema";
import type { SiteConfig } from "@/lib/site-config";
import { productToHomeTemplate } from "@/lib/product-adapter";
import type { BlogPostMeta } from "@/lib/blog";

export interface ProductStructuredDataScriptsProps {
  product: ProductData;
  posts?: BlogPostMeta[];
  siteConfig?: SiteConfig;
  images: string[];
}

export function ProductStructuredDataScripts({ product, posts = [], siteConfig, images }: ProductStructuredDataScriptsProps) {
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
    url: siteConfig?.site?.domain ? `https://${siteConfig.site.domain}/${product.slug}` : `https://serp.app/${product.slug}`,
    storeUrl: siteConfig?.site?.domain ? `https://${siteConfig.site.domain}` : "https://serp.app",
    currency: "USD",
    comingSoon: product.coming_soon ?? false,
    expectedLaunchDate: undefined,
  });

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: "Home", url: "/" },
      { name: product.name },
    ],
    storeUrl: siteConfig?.site?.domain ? `https://${siteConfig.site.domain}` : "https://serp.app",
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
    url: siteConfig?.site?.domain ? `https://${siteConfig.site.domain}/${product.slug}` : `https://serp.app/${product.slug}`,
    downloadUrl: product.purchase_url,
    author: {
      name: "SERP Apps",
      url: "https://serp.app",
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

  const videoScripts = (product.product_videos ?? []).map((video, index) => {
    const videoId = video.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];

    return {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: `${product.name} Demo Video ${index + 1}`,
      description: `Product demonstration for ${product.name}`,
      thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : images[0],
      uploadDate: new Date().toISOString(),
      contentUrl: video,
      embedUrl: video.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/'),
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
