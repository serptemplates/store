import { NextResponse } from "next/server";

import { getAllProducts } from "@/lib/products/product";
import { getProductVideoEntries } from "@/lib/products/video";
import { escapeXml, resolveBaseUrl } from "@/lib/sitemap-utils";

export function GET(): NextResponse {
  const baseUrl = resolveBaseUrl();
  const products = getAllProducts();

  const entries = products.flatMap((product) => {
    const videos = getProductVideoEntries(product);
    return videos.map((video) => {
      const watchUrl = `${baseUrl}${video.watchPath}`;
      const contentUrl = video.url.startsWith("http")
        ? video.url
        : watchUrl;
      const thumbnailUrl = video.thumbnailUrl
        ? video.thumbnailUrl.startsWith("http")
          ? video.thumbnailUrl
          : `${baseUrl}${video.thumbnailUrl}`
        : `${baseUrl}/logo.png`;
      const description =
        video.description?.slice(0, 2048) ??
        `${product.name} video walkthrough`;

      return {
        watchUrl,
        contentUrl,
        thumbnailUrl,
        title: video.title || `${product.name} Demo`,
        description,
      };
    });
  });

  const uniqueEntries = Array.from(
    new Map(entries.map((entry) => [entry.watchUrl, entry])).values(),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${uniqueEntries
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.watchUrl)}</loc>
    <video:video>
      <video:thumbnail_loc>${escapeXml(entry.thumbnailUrl)}</video:thumbnail_loc>
      <video:title>${escapeXml(entry.title)}</video:title>
      <video:description>${escapeXml(entry.description)}</video:description>
      <video:content_loc>${escapeXml(entry.contentUrl)}</video:content_loc>
      <video:player_loc allow_embed="yes">${escapeXml(entry.watchUrl)}</video:player_loc>
    </video:video>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
