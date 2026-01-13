export const STRIPE_METADATA_LIMITS = {
  maxKeys: 50,
  maxKeyLength: 40,
  maxValueLength: 500,
} as const;

export type StripeMetadataSanitizeReport = {
  inputKeys: number;
  outputKeys: number;
  droppedKeys: string[];
  truncatedKeys: string[];
};

function toSnakeCaseKey(key: string): string {
  return key
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .replace(/__+/g, "_")
    .replace(/[^a-z0-9_]/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function canonicalizeStripeMetadataKeys(
  input: Record<string, string>,
  options?: {
    preserveKey?: (key: string) => boolean;
    dropKey?: (key: string) => boolean;
  }
): Record<string, string> {
  const preserveKey = options?.preserveKey;
  const dropKey = options?.dropKey;

  const output: Record<string, string> = {};
  const seenCanonical = new Set<string>();

  for (const [rawKey, rawValue] of Object.entries(input ?? {})) {
    const key = String(rawKey ?? "").trim();
    if (!key) continue;
    if (dropKey?.(key)) continue;

    const value = String(rawValue ?? "").trim();
    if (!value) continue;

    if (preserveKey?.(key)) {
      if (!Object.prototype.hasOwnProperty.call(output, key)) {
        output[key] = value;
      }
      continue;
    }

    const canonical = toSnakeCaseKey(key);
    if (!canonical) continue;
    if (seenCanonical.has(canonical)) continue;
    seenCanonical.add(canonical);
    output[canonical] = value;
  }

  return output;
}

export function enforceStripeMetadataLimits(
  input: Record<string, string>,
  options?: { keepKeysFirst?: string[] }
): { metadata: Record<string, string>; report: StripeMetadataSanitizeReport } {
  const droppedKeys: string[] = [];
  const truncatedKeys: string[] = [];

  const output: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(input ?? {})) {
    const key = String(rawKey ?? "").trim();
    if (!key) continue;

    if (key.length > STRIPE_METADATA_LIMITS.maxKeyLength) {
      droppedKeys.push(key);
      continue;
    }

    const value = String(rawValue ?? "").trim();
    if (!value) continue;

    if (value.length > STRIPE_METADATA_LIMITS.maxValueLength) {
      output[key] = value.slice(0, STRIPE_METADATA_LIMITS.maxValueLength);
      truncatedKeys.push(key);
      continue;
    }

    output[key] = value;
  }

  const keepKeysFirst = options?.keepKeysFirst ?? [];
  const keys = Object.keys(output);
  if (keys.length > STRIPE_METADATA_LIMITS.maxKeys) {
    const prioritizedKeys = keepKeysFirst
      .map((key) => (typeof key === "string" ? key.trim() : ""))
      .filter((key) => key.length > 0);
    const next: Record<string, string> = {};

    for (const key of prioritizedKeys) {
      if (Object.prototype.hasOwnProperty.call(output, key)) {
        next[key] = output[key]!;
      }
    }

    let nextCount = Object.keys(next).length;
    for (const key of keys) {
      if (nextCount >= STRIPE_METADATA_LIMITS.maxKeys) {
        break;
      }
      if (Object.prototype.hasOwnProperty.call(next, key)) {
        continue;
      }
      next[key] = output[key]!;
      nextCount += 1;
    }

    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(next, key)) {
        droppedKeys.push(key);
      }
    }

    return {
      metadata: next,
      report: {
        inputKeys: Object.keys(input ?? {}).length,
        outputKeys: Object.keys(next).length,
        droppedKeys,
        truncatedKeys,
      },
    };
  }

  return {
    metadata: output,
    report: {
      inputKeys: Object.keys(input ?? {}).length,
      outputKeys: Object.keys(output).length,
      droppedKeys,
      truncatedKeys,
    },
  };
}
