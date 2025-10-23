/**
 * Sanitizes untrusted user-provided strings before they hit validation layers.
 * Removes script/HTML tags, trims whitespace, and optionally enforces a maximum length.
 */
import sanitizeHtml from "sanitize-html";

export function sanitizeInput(raw: string | null | undefined, options?: { maxLength?: number }): string {
  if (typeof raw !== "string") {
    return "";
  }

  const maxLength = options?.maxLength && options.maxLength > 0 ? options.maxLength : undefined;

  let value = sanitizeHtml(raw, {
    allowedTags: [],
    allowedAttributes: {},
  });
  // Trim whitespace.
  value = value.trim();

  if (maxLength && value.length > maxLength) {
    value = value.slice(0, maxLength);
  }

  return value;
}
