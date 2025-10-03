import type { Route } from "next";

import type { ProductData } from "./product-schema";

const YOUTUBE_ID_PATTERN = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;
const VIMEO_ID_PATTERN = /vimeo\.com\/(?:video\/)?([0-9]+)/i;

export type SupportedVideoPlatform = "youtube" | "vimeo" | "unknown";

export interface ProductVideoEntry {
  slug: string;
  url: string;
  embedUrl: string;
  watchPath: Route;
  title: string;
  description: string;
  thumbnailUrl?: string;
  platform: SupportedVideoPlatform;
  uploadDate?: string;
  duration?: string;
  source: 'primary' | 'related';
}

type ProductVideoSource = Pick<
  ProductData,
  | "slug"
  | "name"
  | "product_videos"
  | "related_videos"
  | "tagline"
  | "seo_description"
  | "description"
  | "featured_image"
  | "featured_image_gif"
  | "reviews"
>;

function extractYouTubeId(url: string): string | undefined {
  const match = url.match(YOUTUBE_ID_PATTERN);
  return match?.[1];
}

function extractVimeoId(url: string): string | undefined {
  const match = url.match(VIMEO_ID_PATTERN);
  return match?.[1];
}

function buildEmbedUrl(platform: SupportedVideoPlatform, url: string, id?: string): string {
  if (platform === "youtube" && id) {
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
  }

  if (platform === "vimeo" && id) {
    return `https://player.vimeo.com/video/${id}`;
  }

  return url;
}

function buildThumbnailUrl(
  platform: SupportedVideoPlatform,
  id: string | undefined,
  product: ProductVideoSource,
): string | undefined {
  if (platform === "youtube" && id) {
    return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  }

  if (platform === "vimeo" && id) {
    return undefined;
  }

  return product.featured_image || product.featured_image_gif || undefined;
}

function resolveUploadDate(product: ProductVideoSource): string | undefined {
  const candidate = product.reviews?.find((review) => Boolean(review.date));
  if (candidate?.date) {
    const parsed = new Date(candidate.date);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed.toISOString();
    }
  }

  return new Date('2024-01-01T00:00:00Z').toISOString();
}

export function getWatchPath(productSlug: string, videoSlug: string): Route {
  return `/watch/${productSlug}/${videoSlug}` as Route;
}

export function getProductVideoEntries(product: ProductVideoSource): ProductVideoEntry[] {
  const entries: ProductVideoEntry[] = [];
  const primaryVideos = Array.isArray(product.product_videos) ? product.product_videos : [];
  const secondaryVideos = Array.isArray(product.related_videos) ? product.related_videos : [];

  const videos = [
    ...primaryVideos.map((url, index) => ({ url, source: 'primary' as const, index })),
    ...secondaryVideos.map((url, index) => ({ url, source: 'related' as const, index })),
  ];

  if (videos.length === 0) {
    return entries;
  }

  const uploadDate = resolveUploadDate(product);
  const seenKeys = new Set<string>();
  const usedSlugs = new Set<string>();

  videos.forEach(({ url: rawUrl, source, index }) => {
    if (typeof rawUrl !== "string") {
      return;
    }

    const url = rawUrl.trim();
    if (!url) {
      return;
    }

    const youTubeId = extractYouTubeId(url);
    const vimeoId = extractVimeoId(url);

    const platform: SupportedVideoPlatform = youTubeId
      ? "youtube"
      : vimeoId
      ? "vimeo"
      : "unknown";

    const uniquenessKey = (youTubeId || vimeoId || url).toLowerCase();
    if (seenKeys.has(uniquenessKey)) {
      return;
    }
    seenKeys.add(uniquenessKey);

    let slug = youTubeId || vimeoId || `${source}-video-${index + 1}`;
    if (usedSlugs.has(slug)) {
      let suffix = 2;
      while (usedSlugs.has(`${slug}-${suffix}`)) {
        suffix += 1;
      }
      slug = `${slug}-${suffix}`;
    }
    usedSlugs.add(slug);

    const embedUrl = buildEmbedUrl(platform, url, youTubeId ?? vimeoId);
    const thumbnailUrl =
      buildThumbnailUrl(platform, youTubeId ?? vimeoId, product) ||
      product.featured_image ||
      product.featured_image_gif ||
      undefined;

    const title = `${product.name} Demo Video ${entries.length + 1}`;
    const description =
      product.tagline ||
      product.seo_description ||
      product.description ||
      `${product.name} product demonstration.`;

    entries.push({
      slug,
      url,
      embedUrl,
      watchPath: getWatchPath(product.slug, slug),
      title,
      description,
      thumbnailUrl,
      platform,
      uploadDate,
      duration: "PT2M",
      source,
    });
  });

  return entries;
}
