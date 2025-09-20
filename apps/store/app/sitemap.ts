import fs from "node:fs";
import path from "node:path";

import type { MetadataRoute } from "next";

import { getProductSlugs } from "@/lib/product";
import { getSiteConfig } from "@/lib/site-config";

export const runtime = "nodejs";

function resolveBaseUrl(): string {
  const domain = getSiteConfig().site?.domain ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://apps.serp.co";
  return domain.replace(/\/?$/, "");
}

function resolveProductsDir(): string {
  const override = process.env.PRODUCTS_ROOT;
  const dataRoot = override
    ? path.isAbsolute(override)
      ? override
      : path.join(process.cwd(), override)
    : path.join(process.cwd(), "data");

  return path.join(dataRoot, "products");
}

function readLastModified(filePath: string): Date | undefined {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime;
  } catch (error) {
    console.warn(`[sitemap] Unable to read file metadata for ${filePath}:`, error);
    return undefined;
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = resolveBaseUrl();
  const productsDir = resolveProductsDir();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const productSlugs = getProductSlugs();

  productSlugs.forEach((slug) => {
    const productFilePath = path.join(productsDir, `${slug}.yaml`);
    const lastModified = readLastModified(productFilePath) ?? now;

    entries.push({
      url: `${baseUrl}/${slug}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  return entries;
}
