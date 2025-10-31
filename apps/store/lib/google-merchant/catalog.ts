import fs from "node:fs";
import path from "node:path";

import type { ProductData } from "../products/product-schema";
import { getProductData, getProductSlugs, getProductsDataRoot } from "../products/product";

type SiteConfig = {
  excludeSlugs?: string[];
};

export function loadSiteConfig(): SiteConfig {
  const siteConfigPath = path.join(getProductsDataRoot(), "site.config.json");
  try {
    const absolute = path.isAbsolute(siteConfigPath) ? siteConfigPath : path.resolve(siteConfigPath);
    const raw = fs.readFileSync(absolute, "utf8");
    return JSON.parse(raw) as SiteConfig;
  } catch (error) {
    console.warn(
      `[google-merchant] Failed to read site.config.json (${siteConfigPath}):`,
      error instanceof Error ? error.message : error,
    );
    return {};
  }
}

export function listProductSlugs(excluded: Set<string> = new Set()): string[] {
  return getProductSlugs().filter((slug) => !excluded.has(slug));
}

export function loadProduct(slug: string): ProductData {
  return getProductData(slug);
}
