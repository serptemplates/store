const DEFAULT_STORE_URL = "https://apps.serp.co";

export function canonicalizeStoreOrigin(url?: string | null): string {
  if (!url) {
    return DEFAULT_STORE_URL;
  }

  const value = url.trim();
  if (!value) {
    return DEFAULT_STORE_URL;
  }

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(withScheme);
    const host = parsed.hostname.toLowerCase();

    if (host === "store.serp.co" || host === "apps.serp.co") {
      return DEFAULT_STORE_URL;
    }

    return parsed.origin;
  } catch {
    const normalized = withScheme.replace(/\/+$/, "");
    const host = normalized.replace(/^https?:\/\//i, "").toLowerCase();

    if (host === "store.serp.co" || host === "apps.serp.co") {
      return DEFAULT_STORE_URL;
    }

    return normalized;
  }
}

export function getDefaultStoreUrl(): string {
  return DEFAULT_STORE_URL;
}

const STORE_HOSTS = new Set(["store.serp.co", "apps.serp.co"]);

export function canonicalizeStoreHref(href?: string | null, storeUrl?: string | null): string | undefined {
  if (!href) {
    return undefined;
  }

  const value = href.trim();
  if (!value) {
    return undefined;
  }

  if (/^(mailto:|tel:|javascript:|data:)/i.test(value)) {
    return value;
  }

  const baseStoreUrl = canonicalizeStoreOrigin(storeUrl ?? getDefaultStoreUrl());

  try {
    const parsed = new URL(value, baseStoreUrl);
    const host = parsed.hostname.toLowerCase();

    if (STORE_HOSTS.has(host)) {
      const base = new URL(baseStoreUrl);
      parsed.protocol = base.protocol;
      parsed.hostname = base.hostname;
      parsed.port = base.port;
    }
    parsed.hash = "";

    return parsed.toString();
  } catch {
    if (value.startsWith("#")) {
      return `${baseStoreUrl}${value}`;
    }

    const normalizedPath = value.startsWith("/") ? value : `/${value}`;
    return `${baseStoreUrl}${normalizedPath}`;
  }
}
