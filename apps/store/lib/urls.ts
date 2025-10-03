import { getSiteConfig } from "./site-config";

function normalizeDomain(domain: string): string {
  const trimmed = domain.trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function getSiteBaseUrl(): string {
  const domain = getSiteConfig().site?.domain;
  if (domain) {
    return normalizeDomain(domain);
  }

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  return "https://apps.serp.co";
}

export function toAbsoluteUrl(path: string): string {
  const base = getSiteBaseUrl();
  if (!path) {
    return base;
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
