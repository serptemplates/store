import type { StripeMetadataInput, StripeMetadataRecord } from "./types";

export function normalizeMetadata(metadata: StripeMetadataInput): StripeMetadataRecord {
  if (!metadata) {
    return {};
  }

  return Object.entries(metadata).reduce<StripeMetadataRecord>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value;
    }
    return acc;
  }, {});
}
