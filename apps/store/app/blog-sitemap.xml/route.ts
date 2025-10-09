import { NextResponse } from "next/server";

import { buildBlogEntries, escapeXml } from "@/lib/sitemap-utils";

export function GET(): NextResponse {
  const entries = buildBlogEntries();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((entry) => {
    const changefreq = entry.changeFrequency
      ? `    <changefreq>${entry.changeFrequency}</changefreq>\n`
      : "";
    const priority = entry.priority !== undefined
      ? `    <priority>${entry.priority.toFixed(1)}</priority>\n`
      : "";

    return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${entry.lastModified.toISOString()}</lastmod>\n${changefreq}${priority}  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
