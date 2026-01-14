import { canonicalizeStoreOrigin, getDefaultStoreUrl } from "@/lib/canonical-url";
import type { ProductData } from "./product-schema";

const SERP_CO_PRODUCT_BASE_URL = "https://serp.co/products";

type ResolveProductPageUrlOptions = {
  baseUrl?: string | null;
};

function resolveBaseUrl(baseUrl?: string | null): string {
  if (typeof baseUrl === "string" && baseUrl.trim().length > 0) {
    return canonicalizeStoreOrigin(baseUrl);
  }

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return canonicalizeStoreOrigin(envUrl);
  }

  return getDefaultStoreUrl();
}

export function resolveProductPageUrl(
  product: ProductData,
  options: ResolveProductPageUrlOptions = {},
): string {
  const explicit =
    typeof product.product_page_url === "string"
      ? product.product_page_url.trim()
      : "";
  if (explicit) {
    return explicit;
  }

  const baseUrl = resolveBaseUrl(options.baseUrl);
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const slug = typeof product.slug === "string" ? product.slug.trim() : "";

  return slug ? `${normalizedBase}/${slug}` : normalizedBase;
}

export function resolveSerpCoProductPageUrl(product: ProductData): string | null {
  const explicit =
    typeof product.serp_co_product_page_url === "string"
      ? product.serp_co_product_page_url.trim()
      : "";
  if (explicit) {
    return explicit;
  }

  const slug = typeof product.slug === "string" ? product.slug.trim() : "";
  if (!slug) {
    return null;
  }

  return `${SERP_CO_PRODUCT_BASE_URL}/${slug}/`;
}
