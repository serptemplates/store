import type { ExternalVideoMetadata } from "@/lib/products/video-metadata";
import { extractVimeoId, extractYouTubeId, type SupportedVideoPlatform } from "@/lib/products/video";

const YOUTUBE_THUMBNAIL_ORDER = ["maxres", "standard", "high", "medium", "default"] as const;

export interface VideoKeyInfo {
  key: string;
  platform: SupportedVideoPlatform;
  id?: string;
}

export function resolveVideoKey(url: string): VideoKeyInfo {
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

export function toIsoDuration(value: unknown): string | undefined {
  const totalSeconds =
    typeof value === "string"
      ? Number.parseInt(value, 10)
      : typeof value === "number"
      ? Math.round(value)
      : Number.NaN;

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return undefined;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let result = "PT";
  if (hours > 0) {
    result += `${hours}H`;
  }
  if (minutes > 0) {
    result += `${minutes}M`;
  }
  if (seconds > 0 || result === "PT") {
    result += `${seconds}S`;
  }

  return result;
}

type YouTubeThumbnailResponse = Record<string, { url?: string } | undefined> | undefined;

function selectBestYouTubeThumbnail(thumbnails: YouTubeThumbnailResponse): string | undefined {
  if (!thumbnails) {
    return undefined;
  }

  for (const key of YOUTUBE_THUMBNAIL_ORDER) {
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

export async function scrapeExternalVideoMetadata(url: string): Promise<ExternalVideoMetadata | undefined> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}. Status ${response.status}`);
  }

  const html = await response.text();

  interface CandidateMetadata {
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    uploadDate?: string;
    duration?: string | number;
    author?: string;
  }

  const metaCandidates: CandidateMetadata[] = [];

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
            ? candidate.duration.toString()
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
      toIsoDuration(aggregated.duration) ||
      (typeof aggregated.duration === "string" && aggregated.duration.startsWith("PT")
        ? aggregated.duration
        : undefined),
    author: aggregated.author,
  };
}

export interface FetchYouTubeMetadataOptions {
  apiKey: string;
  onChunkFailure?: (error: unknown, context: { offset: number }) => void;
  onChunkStatusFailure?: (status: number, context: { offset: number }) => void;
}

export async function fetchYouTubeMetadata(
  ids: string[],
  options: FetchYouTubeMetadataOptions,
): Promise<Map<string, ExternalVideoMetadata>> {
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
      key: options.apiKey,
      maxResults: String(chunk.length),
    });

    try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`);
      if (!response.ok) {
        options.onChunkStatusFailure?.(response.status, { offset });
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
      options.onChunkFailure?.(error, { offset });
    }
  }

  return results;
}
