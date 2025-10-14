import fs from "node:fs";
import path from "node:path";
import { loadScriptEnvironment } from "./utils/env";

import { getAllProducts } from "@/lib/products/product";
import { resolveUploadDate } from "@/lib/products/video";
import type { ProductData } from "@/lib/products/product-schema";
import type { ExternalVideoMetadata } from "@/lib/products/video-metadata";
import {
  fetchYouTubeMetadata as fetchYouTubeMetadataFromApi,
  resolveVideoKey,
  scrapeExternalVideoMetadata,
} from "@/lib/products/video-scraper";

const { storeDir, repoRoot } = loadScriptEnvironment(import.meta.url);

function resolveDataRoot(): string {
  const candidates = [
    process.env.PRODUCTS_ROOT,
    path.join(storeDir, "data"),
    path.join(repoRoot, "apps", "store", "data"),
    path.join(repoRoot, "data"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const absolute = path.isAbsolute(candidate)
      ? candidate
      : path.resolve(process.cwd(), candidate);

    if (fs.existsSync(path.join(absolute, "products"))) {
      return absolute;
    }
  }

  const checkedPaths = candidates
    .map((value) => (path.isAbsolute(value) ? value : path.resolve(process.cwd(), value)))
    .join(", ");

  throw new Error(
    `Unable to locate product data directory (looked in: ${checkedPaths || "<none>"}). ` +
      "Set PRODUCTS_ROOT to override the data directory.",
  );
}

const debugLogsEnabled = process.env.DEBUG_VIDEO_METADATA === "1";
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

const dataRoot = resolveDataRoot();
if (debugLogsEnabled) {
  console.log(`Using product data root: ${dataRoot}`);
}

const outputPath = path.join(dataRoot, "video-metadata.json");

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

const videoEntries = Array.from(allVideoUrls).map((url) => ({ url, ...resolveVideoKey(url) }));
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
      youtubeMetadata = await fetchYouTubeMetadataFromApi(youtubeIds, {
        apiKey: youtubeApiKey,
        onChunkStatusFailure: (status, { offset }) => {
          console.warn(`YouTube API returned ${status} for chunk starting at ${offset}`);
        },
        onChunkFailure: (error, { offset }) => {
          console.warn(`Failed to fetch YouTube metadata for chunk starting at ${offset}:`, error);
        },
      });
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
      try {
        result = await scrapeExternalVideoMetadata(url);
      } catch (error) {
        console.warn(`Failed to fetch metadata for ${url}:`, error);
      }
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

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(updatedMetadata, null, 2), "utf8");
  console.log(`Saved metadata for ${Object.keys(updatedMetadata).length} videos to ${outputPath}`);
}

main().catch((error) => {
  console.error("Failed to update video metadata", error);
  process.exitCode = 1;
});
