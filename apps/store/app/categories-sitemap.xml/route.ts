import { NextResponse } from "next/server";

import { buildCategoryEntries, escapeXml } from "@/lib/sitemap-utils";

export function GET(): NextResponse {
  const entries = buildCategoryEntries();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((entry) => {
    const changefreq = entry.changeFrequency
      ? `    <changefreq>${entry.changeFrequency}</changefreq>\n`
      : "";
    const priority =
      entry.priority !== undefined
        ? `    <priority>${entry.priority.toFixed(1)}</priority>\n`
        : "";

    return `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastModified.toISOString()}</lastmod>
${changefreq}${priority}  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
