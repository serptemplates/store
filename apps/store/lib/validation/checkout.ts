/**
 * Sanitizes untrusted user-provided strings before they hit validation layers.
 * Removes script/HTML tags, trims whitespace, and optionally enforces a maximum length.
 */
export function sanitizeInput(raw: string | null | undefined, options?: { maxLength?: number }): string {
  if (typeof raw !== "string") {
    return "";
  }

  const maxLength = options?.maxLength && options.maxLength > 0 ? options.maxLength : undefined;

  let value = raw;

  // Remove script tags (case-insensitive, multi-line safe)
  value = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Strip any remaining HTML tags.
  value = value.replace(/<[^>]+>/g, "");
  // Trim whitespace.
  value = value.trim();

  if (maxLength && value.length > maxLength) {
    value = value.slice(0, maxLength);
  }

  return value;
}

