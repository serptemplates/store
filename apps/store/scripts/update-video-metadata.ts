import fs from "node:fs";
import path from "node:path";

import { config as loadEnv } from "dotenv";

import { getAllProducts } from "@/lib/products/product";
import {
  extractVimeoId,
  extractYouTubeId,
  resolveUploadDate,
  type SupportedVideoPlatform,
} from "@/lib/products/video";
import type { ProductData } from "@/lib/products/product-schema";
import type { ExternalVideoMetadata } from "@/lib/products/video-metadata";

const repoRoot = path.resolve(process.cwd(), "../../");
loadEnv({ path: path.join(repoRoot, ".env.local") });
loadEnv({ path: path.join(repoRoot, ".env") });
loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv({ path: path.join(process.cwd(), ".env") });

const outputPath = path.join(process.cwd(), "data", "video-metadata.json");
const debugLogsEnabled = process.env.DEBUG_VIDEO_METADATA === "1";
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

function normalizeKey(url: string): { key: string; platform: SupportedVideoPlatform; id?: string } {
  const youTubeId = extractYouTubeId(url);
  if (youTubeId) {
    return { key: youTubeId.toLowerCase(), id: youTubeId, platform: "youtube" };
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return { key: vimeoId.toLowerCase(), id: vimeoId, platform: "vimeo" };
  }

  return { key: url.trim().toLowerCase(), platform: "unknown" };
}

function secondsToIsoDuration(value: unknown): string | undefined {
  const totalSeconds = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? Math.round(value) : NaN;
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return undefined;
  }

  const seconds = totalSeconds;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  let result = "PT";
  if (hours > 0) {
    result += `${hours}H`;
  }
  if (minutes > 0) {
    result += `${minutes}M`;
  }
  if (remainingSeconds > 0 || result === "PT") {
    result += `${remainingSeconds}S`;
  }
  return result;
}

type YouTubeThumbnailResponse = Record<string, { url?: string } | undefined> | undefined;

function selectBestYouTubeThumbnail(thumbnails: YouTubeThumbnailResponse): string | undefined {
  if (!thumbnails) {
    return undefined;
  }

  const preferredOrder = ["maxres", "standard", "high", "medium", "default"];
  for (const key of preferredOrder) {
    const candidate = thumbnails[key]?.url?.trim();
    if (candidate) {
      return candidate;
    }
  }

  for (const value of Object.values(thumbnails)) {
    const candidate = value?.url?.trim();
    if (candidate) {
      return candidate;
    }
  }

  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMetaTag(html: string, attr: "property" | "name" | "itemprop", value: string): string | undefined {
  const pattern = new RegExp(
    `<meta[^>]+${attr}=["']${escapeRegExp(value)}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const match = html.match(pattern);
  return match?.[1];
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function extractJsonPayload(html: string, marker: string): unknown {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) {
    return undefined;
  }

  let jsonStart = -1;
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let index = markerIndex + marker.length; index < html.length; index += 1) {
    const char = html[index];

    if (jsonStart === -1) {
      if (char === "{") {
        jsonStart = index;
        braceCount = 1;
      }
      continue;
    }

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "{") {
        braceCount += 1;
      } else if (char === "}") {
        braceCount -= 1;
        if (braceCount === 0 && jsonStart !== -1) {
          const slice = html.slice(jsonStart, index + 1);
          try {
            return JSON.parse(slice);
          } catch {
            return undefined;
          }
        }
      }
    }
  }

  return undefined;
}

async function fetchMetadataFromPage(url: string): Promise<ExternalVideoMetadata | undefined> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch ${url}. Status ${response.status}`);
      return undefined;
    }

    const html = await response.text();

    const metaCandidates: Array<ExternalVideoMetadata> = [];

    const directMeta: ExternalVideoMetadata = {
      title:
        extractMetaTag(html, "property", "og:title") ||
        extractMetaTag(html, "name", "twitter:title") ||
        undefined,
      description:
        extractMetaTag(html, "property", "og:description") ||
        extractMetaTag(html, "name", "description") ||
        extractMetaTag(html, "name", "twitter:description") ||
        undefined,
      thumbnailUrl:
        extractMetaTag(html, "property", "og:image") ||
        extractMetaTag(html, "name", "twitter:image") ||
        undefined,
      uploadDate:
        extractMetaTag(html, "itemprop", "uploadDate") ||
        extractMetaTag(html, "property", "video:release_date") ||
        extractMetaTag(html, "property", "article:published_time") ||
        undefined,
      duration:
        extractMetaTag(html, "itemprop", "duration") ||
        extractMetaTag(html, "property", "video:duration") ||
        undefined,
      author:
        extractMetaTag(html, "itemprop", "author") ||
        extractMetaTag(html, "name", "author") ||
        undefined,
    };

    if (directMeta.title || directMeta.description || directMeta.thumbnailUrl) {
      metaCandidates.push(directMeta);
    }

    const playerResponse = extractJsonPayload(html, "ytInitialPlayerResponse = ") as
      | undefined
      | {
          videoDetails?: {
            title?: string;
            shortDescription?: string;
            author?: string;
            lengthSeconds?: string | number;
            thumbnail?: { thumbnails?: Array<{ url?: string }> };
          };
          microformat?: {
            playerMicroformatRenderer?: {
              uploadDate?: string;
              publishDate?: string;
              description?: { simpleText?: string };
              thumbnailUrl?: string;
            };
          };
        };

    if (playerResponse) {
      const videoDetails = playerResponse.videoDetails ?? {};
      const microformat = playerResponse.microformat?.playerMicroformatRenderer ?? {};
      const thumbnails = videoDetails.thumbnail?.thumbnails ?? [];
      const thumbnailCandidate = thumbnails
        .filter((thumb): thumb is { url: string } => typeof thumb?.url === "string")
        .sort((a, b) => (b.url?.length ?? 0) - (a.url?.length ?? 0))[0]?.url;

      metaCandidates.push({
        title: videoDetails.title,
        description: videoDetails.shortDescription ?? microformat.description?.simpleText,
        author: videoDetails.author,
        duration:
          typeof videoDetails.lengthSeconds === "number"
            ? videoDetails.lengthSeconds.toString()
            : videoDetails.lengthSeconds,
        uploadDate: microformat.uploadDate ?? microformat.publishDate,
        thumbnailUrl: thumbnailCandidate ?? microformat.thumbnailUrl,
      });
    }

    const vimeoPayload = extractJsonPayload(html, "window.vimeo.clip_page_config = ") as
      | undefined
      | {
          clip_page_config?: {
            clip?: {
              title?: string;
              description?: string;
              duration?: number;
              upload_date?: string;
              thumbnail?: string;
              owner?: { display_name?: string };
            };
          };
        };

    const clip = vimeoPayload?.clip_page_config?.clip;
    if (clip) {
      metaCandidates.push({
        title: clip.title,
        description: clip.description,
        duration: typeof clip.duration === "number" ? clip.duration.toString() : clip.duration,
        uploadDate: clip.upload_date,
        thumbnailUrl: clip.thumbnail,
        author: clip.owner?.display_name,
      });
    }

    let aggregated: ExternalVideoMetadata | undefined;
    for (const candidate of metaCandidates) {
      const normalized: ExternalVideoMetadata = {
        title: typeof candidate.title === "string" ? decodeHtmlEntities(candidate.title).trim() : undefined,
        description:
          typeof candidate.description === "string" ? decodeHtmlEntities(candidate.description).trim() : undefined,
        thumbnailUrl:
          typeof candidate.thumbnailUrl === "string"
            ? decodeHtmlEntities(candidate.thumbnailUrl).trim()
            : undefined,
        uploadDate: typeof candidate.uploadDate === "string" ? candidate.uploadDate : undefined,
        duration:
          typeof candidate.duration === "number"
            ? String(candidate.duration)
            : typeof candidate.duration === "string"
            ? candidate.duration
            : undefined,
        author: typeof candidate.author === "string" ? decodeHtmlEntities(candidate.author).trim() : undefined,
      };

      if (!aggregated) {
        aggregated = { ...normalized };
        continue;
      }

      if (!aggregated.title && normalized.title) {
        aggregated.title = normalized.title;
      }
      if (!aggregated.description && normalized.description) {
        aggregated.description = normalized.description;
      }
      if (!aggregated.thumbnailUrl && normalized.thumbnailUrl) {
        aggregated.thumbnailUrl = normalized.thumbnailUrl;
      }
      if (!aggregated.uploadDate && normalized.uploadDate) {
        aggregated.uploadDate = normalized.uploadDate;
      }
      if (!aggregated.duration && normalized.duration) {
        aggregated.duration = normalized.duration;
      }
      if (!aggregated.author && normalized.author) {
        aggregated.author = normalized.author;
      }
    }

    if (!aggregated) {
      return undefined;
    }

    let uploadDateIso: string | undefined;
    if (aggregated.uploadDate) {
      const parsed = new Date(aggregated.uploadDate);
      if (!Number.isNaN(parsed.valueOf())) {
        uploadDateIso = parsed.toISOString();
      }
    }

    return {
      title: aggregated.title,
      description: aggregated.description,
      thumbnailUrl: aggregated.thumbnailUrl,
      uploadDate: uploadDateIso,
      duration:
        secondsToIsoDuration(aggregated.duration) ||
        (typeof aggregated.duration === "string" && aggregated.duration.startsWith("PT")
          ? aggregated.duration
          : undefined),
      author: aggregated.author,
    };
  } catch (error) {
    console.warn(`Failed to fetch metadata for ${url}:`, error);
    return undefined;
  }
}

async function fetchYouTubeMetadata(ids: string[], apiKey: string): Promise<Map<string, ExternalVideoMetadata>> {
  const results = new Map<string, ExternalVideoMetadata>();
  if (ids.length === 0) {
    return results;
  }

  const chunkSize = 50;
  for (let offset = 0; offset < ids.length; offset += chunkSize) {
    const chunk = ids.slice(offset, offset + chunkSize);
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      id: chunk.join(","),
      key: apiKey,
      maxResults: String(chunk.length),
    });

    try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`);
      if (!response.ok) {
        console.warn(`YouTube API returned ${response.status} for chunk starting at ${offset}`);
        continue;
      }

      const payload = (await response.json()) as {
        items?: Array<{
          id?: string;
          snippet?: {
            title?: string;
            description?: string;
            publishedAt?: string;
            channelTitle?: string;
            thumbnails?: YouTubeThumbnailResponse;
          };
          contentDetails?: {
            duration?: string;
          };
        }>;
      };

      const items = payload.items ?? [];
      const fetchTimestamp = new Date().toISOString();

      for (const item of items) {
        const id = item.id?.trim();
        if (!id) {
          continue;
        }

        const snippet = item.snippet ?? {};
        const contentDetails = item.contentDetails ?? {};

        let uploadDateIso: string | undefined;
        if (typeof snippet.publishedAt === "string") {
          const parsed = new Date(snippet.publishedAt);
          if (!Number.isNaN(parsed.valueOf())) {
            uploadDateIso = parsed.toISOString();
          }
        }

        const metadata: ExternalVideoMetadata = {
          title: typeof snippet.title === "string" ? snippet.title.trim() : undefined,
          description: typeof snippet.description === "string" ? snippet.description.trim() : undefined,
          thumbnailUrl: selectBestYouTubeThumbnail(snippet.thumbnails),
          uploadDate: uploadDateIso,
          duration: typeof contentDetails.duration === "string" ? contentDetails.duration : undefined,
          author: typeof snippet.channelTitle === "string" ? snippet.channelTitle.trim() : undefined,
          lastFetchedAt: fetchTimestamp,
        };

        results.set(id.toLowerCase(), metadata);
      }
    } catch (error) {
      console.warn(`Failed to fetch YouTube metadata for chunk starting at ${offset}:`, error);
    }
  }

  return results;
}

async function main() {
  const products = getAllProducts();
  const allVideoUrls = new Set<string>();
  const urlToProduct = new Map<
    string,
    {
      product: ProductData;
      source: "primary" | "related";
      index: number;
    }
  >();

  const registerUrl = (
    urlValue: unknown,
    product: ProductData,
    source: "primary" | "related",
    index: number,
  ) => {
    if (typeof urlValue !== "string") {
      return;
    }

    const trimmed = urlValue.trim();
    if (!trimmed) {
      return;
    }

    allVideoUrls.add(trimmed);
    if (!urlToProduct.has(trimmed)) {
      urlToProduct.set(trimmed, { product, source, index });
    }
  };

  products.forEach((product) => {
    (product.product_videos ?? []).forEach((url, index) => registerUrl(url, product, "primary", index));
    (product.related_videos ?? []).forEach((url, index) => registerUrl(url, product, "related", index));
  });

  if (allVideoUrls.size === 0) {
    console.log("No video URLs found in product catalog.");
    return;
  }

  const existingMetadata: Record<string, ExternalVideoMetadata> = fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
    : {};

const videoEntries = Array.from(allVideoUrls).map((url) => ({ url, ...normalizeKey(url) }));
const fallbackMetadataForUrl = (url: string): ExternalVideoMetadata | undefined => {
  const mapping = urlToProduct.get(url);
  if (!mapping) {
    return undefined;
  }

  const { product, index, source } = mapping;
  const ordinal = index + 1;

  const titleBase = `${product.name} ${source === "primary" ? "Demo" : "Related"} Video ${ordinal}`;
  const description =
    product.tagline ||
    product.seo_description ||
    product.description ||
    `${product.name} product demonstration.`;

  const thumbnailUrl = product.featured_image || product.featured_image_gif || undefined;
  const uploadDate = resolveUploadDate(product) ?? new Date().toISOString();

  return {
    title: titleBase,
    description,
    thumbnailUrl,
    uploadDate,
    duration: "PT2M",
    author: product.name,
  };
};
  const youtubeIds = Array.from(
    new Set(
      videoEntries
        .filter((entry) => entry.platform === "youtube" && entry.id)
        .map((entry) => entry.id!)
    )
  );

  let youtubeMetadata = new Map<string, ExternalVideoMetadata>();
  if (youtubeIds.length > 0) {
    if (youtubeApiKey) {
      youtubeMetadata = await fetchYouTubeMetadata(youtubeIds, youtubeApiKey);
    } else {
      console.warn("YOUTUBE_API_KEY is not set; falling back to HTML scraping for YouTube videos.");
    }
  }

  const updatedMetadata: Record<string, ExternalVideoMetadata> = { ...existingMetadata };
  const requiredFields: Array<keyof ExternalVideoMetadata> = [
    "title",
    "description",
    "thumbnailUrl",
    "uploadDate",
    "duration",
  ];

  const hasAllRequired = (metadata?: ExternalVideoMetadata, fallback?: ExternalVideoMetadata) => {
    if (!metadata) {
      return false;
    }

    return requiredFields.every((field) => {
      const value = metadata[field] ?? fallback?.[field];
      return Boolean(value) && (typeof value !== "string" || value.trim().length > 0);
    });
  };

  let processed = 0;

  for (const { url, key, platform, id } of videoEntries) {
    const existing = updatedMetadata[key];

    const fallback = fallbackMetadataForUrl(url);

    if (hasAllRequired(existing, fallback) && !debugLogsEnabled) {
      updatedMetadata[key] = {
        ...(fallback ?? {}),
        ...existing,
        source: existing?.source ?? platform,
        url: existing?.url ?? url,
        lastFetchedAt: existing?.lastFetchedAt ?? new Date().toISOString(),
      };
      processed += 1;
      continue;
    }

    let result: ExternalVideoMetadata | undefined;

    if (platform === "youtube" && id) {
      const apiResult = youtubeMetadata.get(id.toLowerCase());
      if (apiResult) {
        console.log(`Using YouTube API metadata for ${url}`);
        result = apiResult;
      }
    }

    if (!result) {
      console.log(`Fetching metadata for ${url}`);
      result = await fetchMetadataFromPage(url);
    }

    const combined: ExternalVideoMetadata = {
      ...(fallback ?? {}),
      ...(existing ?? {}),
      ...(result ?? {}),
      source: platform,
      url,
      lastFetchedAt: result?.lastFetchedAt ?? existing?.lastFetchedAt ?? new Date().toISOString(),
    };

    const missing = requiredFields.filter((field) => {
      const value = combined[field];
      return !value || (typeof value === "string" && value.trim().length === 0);
    });

    if (missing.length > 0) {
      console.warn(
        `Video metadata for ${url} is missing required fields (${missing.join(", ")}). ` +
          "Filling with defaults where possible.",
      );

      if (!combined.title) {
        combined.title = fallback?.title ?? `Video ${key}`;
      }
      if (!combined.description) {
        combined.description =
          fallback?.description ??
          "Product video overview.";
      }
      if (!combined.thumbnailUrl) {
        combined.thumbnailUrl = fallback?.thumbnailUrl ?? undefined;
      }
      if (!combined.uploadDate) {
        combined.uploadDate =
          fallback?.uploadDate ?? new Date("2024-01-01T00:00:00Z").toISOString();
      }
      if (!combined.duration) {
        combined.duration = fallback?.duration ?? "PT2M";
      }
    }

    updatedMetadata[key] = combined;

    processed += 1;
    // Throttle lightly between fetches to avoid hammering providers
    await new Promise((resolve) => setTimeout(resolve, processed % 5 === 0 ? 1_000 : 200));
  }

  fs.writeFileSync(outputPath, JSON.stringify(updatedMetadata, null, 2), "utf8");
  console.log(`Saved metadata for ${Object.keys(updatedMetadata).length} videos to ${outputPath}`);
}

main().catch((error) => {
  console.error("Failed to update video metadata", error);
  process.exitCode = 1;
});
