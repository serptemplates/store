import { canonicalizeStoreOrigin, getDefaultStoreUrl } from "./canonical-url";
import { getSiteConfig } from "./site-config";

function normalizeDomain(domain: string): string {
  return canonicalizeStoreOrigin(domain);
}

export function getSiteBaseUrl(): string {
  const domain = getSiteConfig().site?.domain;
  if (domain) {
    return normalizeDomain(domain);
  }

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) {
    return canonicalizeStoreOrigin(envUrl);
  }

  return getDefaultStoreUrl();
}

export function getStoreBaseUrl(options: { isTest?: boolean } = {}): string {
  const configured = process.env.NEXT_PUBLIC_STORE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return canonicalizeStoreOrigin(configured);
  }

  if (options.isTest) {
    return "http://localhost:3000";
  }

  const domain = getSiteConfig().site?.domain;
  if (domain) {
    return normalizeDomain(domain);
  }

  return getDefaultStoreUrl();
}

export function toAbsoluteUrl(path: string): string {
  const base = getSiteBaseUrl();
  if (!path) {
    return base;
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
