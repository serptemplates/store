import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

import { productSchema, type ProductData } from "../products/product-schema";

type SiteConfig = {
  excludeSlugs?: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../..");
const storeDataDir = path.join(repoRoot, "apps", "store", "data");
const productsDir = path.join(storeDataDir, "products");
const siteConfigPath = path.join(storeDataDir, "site.config.json");

export function loadSiteConfig(): SiteConfig {
  try {
    const raw = fs.readFileSync(siteConfigPath, "utf8");
    return JSON.parse(raw) as SiteConfig;
  } catch {
    return {};
  }
}

export function listProductSlugs(excluded: Set<string> = new Set()): string[] {
  const files = fs.readdirSync(productsDir).filter((file) => /\.ya?ml$/i.test(file));
  return files
    .map((file) => file.replace(/\.ya?ml$/i, ""))
    .filter((slug) => !excluded.has(slug))
    .sort((a, b) => a.localeCompare(b));
}

export function loadProduct(slug: string): ProductData {
  const filePath = path.join(productsDir, `${slug}.yaml`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing product file for slug "${slug}" (${filePath})`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = parse(raw);
  return productSchema.parse(parsed);
}
