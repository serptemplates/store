const FALLBACK_STORE_URL = "https://apps.serp.co";
const DEFAULT_STORE_HOSTS = new Set(["store.serp.co", "apps.serp.co"]);

function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return FALLBACK_STORE_URL;
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withScheme).origin;
  } catch {
    return withScheme.replace(/\/+$/, "");
  }
}

function getStoreHosts(): Set<string> {
  const hosts = new Set(DEFAULT_STORE_HOSTS);
  try {
    const parsed = new URL(normalizeOrigin(getDefaultStoreUrl()));
    hosts.add(parsed.hostname.toLowerCase());
  } catch {
    // ignore malformed store url
  }
  return hosts;
}

export function canonicalizeStoreOrigin(url?: string | null): string {
  if (!url) {
    return getDefaultStoreUrl();
  }

  const value = url.trim();
  if (!value) {
    return getDefaultStoreUrl();
  }

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(withScheme);
    const host = parsed.hostname.toLowerCase();

    if (getStoreHosts().has(host)) {
      return getDefaultStoreUrl();
    }

    return parsed.origin;
  } catch {
    const normalized = withScheme.replace(/\/+$/, "");
    const host = normalized.replace(/^https?:\/\//i, "").toLowerCase();

    if (getStoreHosts().has(host)) {
      return getDefaultStoreUrl();
    }

    return normalized;
  }
}

export function getDefaultStoreUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_STORE_BASE_URL ??
    process.env.STORE_BASE_URL ??
    "";
  return configured.trim().length > 0 ? normalizeOrigin(configured) : FALLBACK_STORE_URL;
}

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

    if (getStoreHosts().has(host)) {
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
