import fs from "node:fs";
import path from "node:path";

export interface ExternalVideoMetadata {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  uploadDate?: string;
  duration?: string;
  author?: string;
  source?: string;
  lastFetchedAt?: string;
  url?: string;
}

let cachedMetadata: Record<string, ExternalVideoMetadata> | null = null;
const metadataFilePath = path.join(process.cwd(), "data", "video-metadata.json");

function loadVideoMetadata(): Record<string, ExternalVideoMetadata> {
  if (cachedMetadata) {
    return cachedMetadata;
  }

  try {
    const fileRaw = fs.readFileSync(metadataFilePath, "utf8");
    const parsed = JSON.parse(fileRaw);
    if (parsed && typeof parsed === "object") {
      cachedMetadata = parsed as Record<string, ExternalVideoMetadata>;
    } else {
      cachedMetadata = {};
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[video-metadata] Unable to load video metadata cache:", error);
    }
    cachedMetadata = {};
  }

  return cachedMetadata;
}

export function getVideoMetadataByKeys(keys: Array<string | undefined | null>): ExternalVideoMetadata | undefined {
  const metadata = loadVideoMetadata();

  for (const key of keys) {
    if (!key) {
      continue;
    }

    const normalizedKey = key.trim().toLowerCase();
    const entry = metadata[normalizedKey];
    if (entry) {
      return entry;
    }
  }

  return undefined;
}

export function resetVideoMetadataCache() {
  cachedMetadata = null;
}
