const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

/**
 * Normalizes an asset reference from product content.
 * - Empty/whitespace values return null.
 * - HTTP(S) URLs are returned as-is.
 * - Relative paths are coerced to a root-relative path (e.g. "media/foo.png" → "/media/foo.png").
 */
export function normalizeProductAssetPath(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  const sanitized = trimmed.replace(/^(\.\/)+/, "").replace(/^\/+/, "");
  return `/${sanitized}`;
}

export function toAbsoluteProductAssetUrl(
  value: string | null | undefined,
  origin: string,
): string | null {
  if (!value) {
    return null;
  }

  if (ABSOLUTE_URL_PATTERN.test(value)) {
    return value;
  }

  const normalizedOrigin = origin.replace(/\/$/, "");
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${normalizedOrigin}${normalizedPath}`;
}

export function filterDefinedAssets(values: Array<string | null | undefined>): string[] {
  return values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}
