import type Stripe from "stripe";

type MetadataSource = Record<string, unknown> | Stripe.Metadata | null | undefined;

function toSnakeCaseKey(key: string): string {
  return key
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .replace(/__+/g, "_")
    .replace(/[^a-z0-9_]/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, chr: string) => chr.toUpperCase());
}

function metadataKeyCandidates(key: string): string[] {
  const base = key ?? "";
  const snake = toSnakeCaseKey(base);
  const camel = snakeToCamel(snake);
  const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
  const kebab = snake.replace(/_/g, "-");
  return Array.from(new Set([base, snake, camel, pascal, kebab].filter(Boolean)));
}

function mirrorKey(metadata: Record<string, unknown>, key: string, value: unknown) {
  const snake = toSnakeCaseKey(key);
  const camel = snakeToCamel(snake);
  if (!Object.prototype.hasOwnProperty.call(metadata, snake)) {
    metadata[snake] = value;
  }
  if (!Object.prototype.hasOwnProperty.call(metadata, camel)) {
    metadata[camel] = value;
  }
}

export function getMetadataValue(metadata: MetadataSource, key: string): unknown {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }
  const container = metadata as Record<string, unknown>;
  for (const candidate of metadataKeyCandidates(key)) {
    if (Object.prototype.hasOwnProperty.call(container, candidate)) {
      const value = container[candidate];
      if (value !== undefined) {
        return value;
      }
    }
  }
  return undefined;
}

export function getMetadataString(metadata: MetadataSource, key: string): string | null {
  const value = getMetadataValue(metadata, key);
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

export function getMetadataList(metadata: MetadataSource, key: string): string[] {
  const raw = getMetadataString(metadata, key);
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function hasMetadataValue(metadata: MetadataSource, key: string): boolean {
  return getMetadataValue(metadata, key) !== undefined;
}

export function ensureMetadataCaseVariants<T extends Record<string, unknown>>(metadata: T): T {
  if (!metadata || typeof metadata !== "object") {
    return metadata;
  }
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) continue;
    mirrorKey(metadata, key, value);
  }
  return metadata;
}
