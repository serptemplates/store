import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { productSchema, type ProductData } from "./product-schema";
import { isExcludedSlug } from "@/lib/site-config";

function resolveDataRoot() {
  const override = process.env.PRODUCTS_ROOT;
  if (override) {
    return path.isAbsolute(override) ? override : path.join(process.cwd(), override);
  }
  return path.join(process.cwd(), "data");
}

const dataRoot = resolveDataRoot();
const productsDir = path.join(dataRoot, "products");

let cachedSlugs: string[] | undefined;
const productCache = new Map<string, ProductData>();

function loadProductFromFile(slug: string): ProductData {
  const filePath = path.join(productsDir, `${slug}.yaml`);
  const rawFile = fs.readFileSync(filePath, "utf8");
  const parsed = parse(rawFile);
  return productSchema.parse(parsed);
}

export function getProductSlugs(): string[] {
  if (!cachedSlugs) {
    if (!fs.existsSync(productsDir)) {
      cachedSlugs = [];
      return cachedSlugs;
    }

    cachedSlugs = fs
      .readdirSync(productsDir)
      .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
      .map((file) => file.replace(/\.ya?ml$/i, ""))
      .filter((slug) => !isExcludedSlug(slug))
      .sort();
  }

  return cachedSlugs;
}

export function getProductData(slug?: string): ProductData {
  const [firstSlug] = getProductSlugs();
  const targetSlug = slug ?? firstSlug;

  if (!targetSlug) {
    throw new Error("No product definitions found under data/products");
  }

  if (productCache.has(targetSlug)) {
    return productCache.get(targetSlug)!;
  }

  const product = loadProductFromFile(targetSlug);
  productCache.set(targetSlug, product);
  return product;
}

export function getAllProducts(): ProductData[] {
  return getProductSlugs().map((slug) => getProductData(slug));
}

export function getProductJson(slug?: string, indent = 2): string {
  const product = getProductData(slug);
  return JSON.stringify(product, null, indent);
}
