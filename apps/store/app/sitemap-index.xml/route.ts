import { NextResponse } from "next/server";

import {
  SITEMAP_PAGE_SIZE,
  buildBlogEntries,
  buildCategoryEntries,
  buildCorePageEntries,
  buildProductEntries,
  escapeXml,
  resolveBaseUrl,
} from "@/lib/sitemap-utils";

export function GET(): NextResponse {
  const baseUrl = resolveBaseUrl();
  const now = new Date();

  const coreEntries = buildCorePageEntries();
  const coreLastMod =
    coreEntries.reduce<Date | null>((latest, entry) => {
      return !latest || entry.lastModified > latest ? entry.lastModified : latest;
    }, null) ?? now;

  const productEntries = buildProductEntries();
  const totalProductPages = productEntries.length
    ? Math.max(1, Math.ceil(productEntries.length / SITEMAP_PAGE_SIZE))
    : 0;
  const productLastMod = productEntries.length
    ? productEntries.reduce<Date | null>((latest, entry) => {
        return !latest || entry.lastModified > latest ? entry.lastModified : latest;
      }, null) ?? now
    : null;

  const blogEntries = buildBlogEntries();
  const blogLastMod =
    blogEntries.reduce<Date | null>((latest, entry) => {
      return !latest || entry.lastModified > latest ? entry.lastModified : latest;
    }, null) ?? now;

  const categoryEntries = buildCategoryEntries();
  const categoryLastMod =
    categoryEntries.reduce<Date | null>((latest, entry) => {
      return !latest || entry.lastModified > latest ? entry.lastModified : latest;
    }, null) ?? now;

  const sitemapEntries: Array<{ loc: string; lastmod: string }> = [];

  if (coreEntries.length > 0) {
    sitemapEntries.push({
      loc: `${baseUrl}/pages-sitemap.xml`,
      lastmod: coreLastMod.toISOString(),
    });
  }

  if (totalProductPages > 0 && productLastMod) {
    sitemapEntries.push({
      loc: `${baseUrl}/apps-sitemap.xml`,
      lastmod: productLastMod.toISOString(),
    });

    for (let page = 2; page <= totalProductPages; page += 1) {
      sitemapEntries.push({
        loc: `${baseUrl}/apps-sitemap-${page}.xml`,
        lastmod: productLastMod.toISOString(),
      });
    }
  }

  if (blogEntries.length > 0) {
    sitemapEntries.push({
      loc: `${baseUrl}/blog-sitemap.xml`,
      lastmod: blogLastMod.toISOString(),
    });
  }

  if (categoryEntries.length > 0) {
    sitemapEntries.push({
      loc: `${baseUrl}/categories-sitemap.xml`,
      lastmod: categoryLastMod.toISOString(),
    });
  }

  sitemapEntries.push({
    loc: `${baseUrl}/videos-sitemap.xml`,
    lastmod: now.toISOString(),
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (item) => `  <sitemap>
    <loc>${escapeXml(item.loc)}</loc>
    <lastmod>${item.lastmod}</lastmod>
  </sitemap>`
  )
  .join("\n")}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
