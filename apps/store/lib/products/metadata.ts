import type { Metadata } from "next";
import type { ProductData } from "./product-schema";
import { resolveSeoTitle, resolveSeoDescription } from "./unofficial-branding";

const STORE_URL = "https://apps.serp.co";

function buildCanonicalUrl(slug: string): string {
  const trimmed = slug.trim().replace(/^\/+|\/+$/g, "");
  return `${STORE_URL}/${trimmed}`;
}

export function buildProductMetadata(product: ProductData): Metadata {
  const baseTitle = product.seo_title?.trim() || product.name.trim();
  const title = resolveSeoTitle(product, baseTitle);
  const description = resolveSeoDescription(product);
  const canonical = buildCanonicalUrl(product.slug);

  const imageCandidates = [product.featured_image, product.featured_image_gif].filter(
    (value): value is string => Boolean(value && value.trim().length > 0),
  );

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      images: imageCandidates.length
        ? imageCandidates.map((url) => ({ url }))
        : undefined,
    },
    twitter: {
      card: imageCandidates.length ? "summary_large_image" : "summary",
      title,
      description,
      images: imageCandidates.length ? imageCandidates : undefined,
    },
  } satisfies Metadata;
}
