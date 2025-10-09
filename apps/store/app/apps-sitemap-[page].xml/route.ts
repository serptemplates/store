import { NextResponse } from "next/server";

import {
  SITEMAP_PAGE_SIZE,
  buildProductEntries,
  escapeXml,
} from "@/lib/sitemap-utils";

export function GET(request: Request): NextResponse {
  const { pathname } = new URL(request.url);
  const match = pathname.match(/\/apps-sitemap-(\d+)\.xml$/);
  const pageNumber = match ? Number.parseInt(match[1] ?? "", 10) : NaN;
  if (!Number.isFinite(pageNumber) || pageNumber < 2) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const entries = buildProductEntries();
  const totalPages = Math.max(1, Math.ceil(entries.length / SITEMAP_PAGE_SIZE));

  if (pageNumber > totalPages) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const start = (pageNumber - 1) * SITEMAP_PAGE_SIZE;
  const slice = entries.slice(start, start + SITEMAP_PAGE_SIZE);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${slice
  .map((entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastModified.toISOString()}</lastmod>
${entry.changeFrequency ? `    <changefreq>${entry.changeFrequency}</changefreq>\n` : ""}${
    entry.priority !== undefined
      ? `    <priority>${entry.priority.toFixed(1)}</priority>\n`
      : ""
  }  </url>`)
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
