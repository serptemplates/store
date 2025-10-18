import { NextResponse } from "next/server";

import { getAllProducts } from "@/lib/products/product";
import { getProductVideoEntries } from "@/lib/products/video";
import { escapeXml, resolveBaseUrl } from "@/lib/sitemap-utils";

const DIRECT_VIDEO_EXTENSIONS = /\.(?:mp4|m4v|mov|webm|ogv|ogg|mkv|avi|wmv)$/i;

function toAbsoluteUrl(url: string | undefined, baseUrl: string): string | undefined {
  if (!url) {
    return undefined;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("/")) {
    return `${baseUrl}${url}`;
  }

  return `${baseUrl}/${url}`;
}

function isDirectVideoUrl(url: string): boolean {
  const cleanUrl = url.split(/[?#]/)[0] ?? url;
  return DIRECT_VIDEO_EXTENSIONS.test(cleanUrl);
}

function normalizeIsoDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return undefined;
  }

  return parsed.toISOString();
}

function durationToSeconds(duration: string | undefined): number | undefined {
  if (!duration) {
    return undefined;
  }

  if (/^\d+$/.test(duration)) {
    return Number.parseInt(duration, 10);
  }

  const pattern =
    /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i;
  const match = duration.match(pattern);

  if (!match) {
    return undefined;
  }

  const [, days, hours, minutes, seconds] = match;
  const totalSeconds =
    (days ? Number.parseFloat(days) * 86400 : 0) +
    (hours ? Number.parseFloat(hours) * 3600 : 0) +
    (minutes ? Number.parseFloat(minutes) * 60 : 0) +
    (seconds ? Number.parseFloat(seconds) : 0);

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return undefined;
  }

  return Math.round(totalSeconds);
}

export function GET(): NextResponse {
  const baseUrl = resolveBaseUrl();
  const products = getAllProducts();

  const entries = products.flatMap((product) => {
    const videos = getProductVideoEntries(product);
    return videos.map((video) => {
      const watchUrl = `${baseUrl}${video.watchPath}`;
      const absoluteVideoUrl = toAbsoluteUrl(video.url, baseUrl);
      const contentUrl =
        absoluteVideoUrl && isDirectVideoUrl(absoluteVideoUrl)
          ? absoluteVideoUrl
          : undefined;
      const playerUrlCandidate = toAbsoluteUrl(video.embedUrl, baseUrl);
      const playerUrl =
        playerUrlCandidate &&
        playerUrlCandidate !== watchUrl &&
        playerUrlCandidate !== contentUrl
          ? playerUrlCandidate
          : undefined;
      const thumbnailUrl = video.thumbnailUrl
        ? video.thumbnailUrl.startsWith("http")
          ? video.thumbnailUrl
          : `${baseUrl}${video.thumbnailUrl}`
        : `${baseUrl}/logo.svg`;
      const description =
        video.description?.slice(0, 2048) ??
        `${product.name} video walkthrough`;

      return {
        watchUrl,
        contentUrl,
        playerUrl,
        thumbnailUrl,
        title: video.title || `${product.name} Demo`,
        description,
        publicationDate: normalizeIsoDate(video.uploadDate),
        durationSeconds: durationToSeconds(video.duration),
      };
    });
  });

  const uniqueEntries = Array.from(
    new Map(entries.map((entry) => [entry.watchUrl, entry])).values(),
  );

  const xmlEntries = uniqueEntries
    .map((entry) => {
      const videoFields = [
        `      <video:thumbnail_loc>${escapeXml(entry.thumbnailUrl)}</video:thumbnail_loc>`,
        `      <video:title>${escapeXml(entry.title)}</video:title>`,
        `      <video:description>${escapeXml(entry.description)}</video:description>`,
      ];

      if (entry.playerUrl) {
        videoFields.push(
          `      <video:player_loc allow_embed="yes">${escapeXml(entry.playerUrl)}</video:player_loc>`,
        );
      }

      if (entry.contentUrl) {
        videoFields.push(
          `      <video:content_loc>${escapeXml(entry.contentUrl)}</video:content_loc>`,
        );
      }

      if (entry.publicationDate) {
        videoFields.push(
          `      <video:publication_date>${escapeXml(entry.publicationDate)}</video:publication_date>`,
        );
      }

      if (typeof entry.durationSeconds === "number") {
        videoFields.push(
          `      <video:duration>${entry.durationSeconds}</video:duration>`,
        );
      }

      return `  <url>
    <loc>${escapeXml(entry.watchUrl)}</loc>
    <video:video>
${videoFields.join("\n")}
    </video:video>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${xmlEntries}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
