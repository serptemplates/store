import fs from "node:fs";
import path from "node:path";

import { getProductSlugs } from "@/lib/products/product";
import { getAllPosts } from "@/lib/blog";
import { getSiteConfig } from "@/lib/site-config";

function resolveProductsDir(): string {
  const candidates = [
    process.env.PRODUCTS_ROOT,
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "apps", "store", "data"),
    path.join(process.cwd(), "..", "data"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const absolute = path.isAbsolute(candidate)
      ? candidate
      : path.resolve(process.cwd(), candidate);

    const productsPath = path.join(absolute, "products");
    if (fs.existsSync(productsPath)) {
      return productsPath;
    }
  }

  const tried = candidates
    .map((value) => (path.isAbsolute(value) ? value : path.resolve(process.cwd(), value)))
    .join(", ");

  throw new Error(
    `Unable to locate product data directory (checked: ${tried || "<none>"}). ` +
      "Set PRODUCTS_ROOT to override the data directory.",
  );
}

export const SITEMAP_PAGE_SIZE = 20000;

export type SitemapUrlEntry = {
  loc: string;
  lastModified: Date;
  changeFrequency?: string;
  priority?: number;
};

export function resolveBaseUrl(): string {
  const domain =
    getSiteConfig().site?.domain ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://apps.serp.co";

  return domain.replace(/\/$/, "");
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

export function buildCorePageEntries(): SitemapUrlEntry[] {
  const baseUrl = resolveBaseUrl();
  const now = new Date();
  const siteConfig = getSiteConfig();

  const entryMap = new Map<string, SitemapUrlEntry>([
    [
      `${baseUrl}/`,
      {
        loc: `${baseUrl}/`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 1,
      },
    ],
    [
      `${baseUrl}/videos`,
      {
        loc: `${baseUrl}/videos`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.85,
      },
    ],
    [
      `${baseUrl}/blog`,
      {
        loc: `${baseUrl}/blog`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
      },
    ],
  ]);

  const navigationLinks = siteConfig.navigation?.links ?? [];
  navigationLinks.forEach((link) => {
    if (!link?.href || !link.href.startsWith("/")) {
      return;
    }

    const url = `${baseUrl}${link.href}`;
    if (!entryMap.has(url)) {
      entryMap.set(url, {
        loc: url,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  });

  return Array.from(entryMap.values());
}

export function buildProductEntries(): SitemapUrlEntry[] {
  const baseUrl = resolveBaseUrl();
  const productsDir = resolveProductsDir();
  const now = new Date();

  return getProductSlugs().map((slug) => {
    const productFilePath = path.join(productsDir, `${slug}.yaml`);
    const lastModified = readLastModified(productFilePath) ?? now;

    return {
      loc: `${baseUrl}/${slug}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    } satisfies SitemapUrlEntry;
  });
}

export function buildBlogEntries(): SitemapUrlEntry[] {
  const baseUrl = resolveBaseUrl();
  return getAllPosts().map((post) => ({
    loc: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
}

export function buildAppSitemapEntries(): SitemapUrlEntry[] {
  return [
    ...buildCorePageEntries(),
    ...buildProductEntries(),
    ...buildBlogEntries(),
  ];
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
