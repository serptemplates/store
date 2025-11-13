import fs from "node:fs";
import path from "node:path";
import stripJsonComments from "strip-json-comments";

import { productSchema, type ProductData } from "./product-schema";
import { isExcludedSlug } from "@/lib/site-config";

const PRODUCT_DIRECTORY_NAME = "products";
const PRODUCT_FILE_EXTENSION = ".json";
const PRODUCT_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export type ProductFileResolution = {
  slug: string;
  absolutePath: string;
};

function resolveDataRoot() {
  const override = process.env.PRODUCTS_ROOT;
  const candidates = [
    override,
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "apps", "store", "data"),
    path.join(process.cwd(), "..", "data"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const absolute = path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate);
    const productsPath = path.join(absolute, PRODUCT_DIRECTORY_NAME);
    if (fs.existsSync(productsPath)) {
      return absolute;
    }
  }

  const tried = candidates
    .map((candidate) => (path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate)))
    .join(", ");

  throw new Error(
    `Unable to locate product data directory (checked: ${tried || "<none>"}). Set PRODUCTS_ROOT to override.`,
  );
}

const dataRoot = resolveDataRoot();
const productsDir = path.join(dataRoot, PRODUCT_DIRECTORY_NAME);

let cachedSlugs: string[] | undefined;
const productCache = new Map<string, ProductData>();

function assertValidProductSlug(slug: string, allowedSlugs?: readonly string[]): string {
  if (typeof slug !== "string") {
    throw new Error("Product slug must be a string");
  }

  const normalized = slug.trim();
  if (normalized.length === 0) {
    throw new Error("Product slug cannot be empty");
  }

  if (normalized !== slug) {
    throw new Error(`Product slug must not contain leading or trailing whitespace: "${slug}"`);
  }

  if (!PRODUCT_SLUG_PATTERN.test(normalized)) {
    throw new Error(
      `Product slug "${slug}" contains unsupported characters. Allowed: lowercase letters, numbers, and hyphens.`,
    );
  }

  const candidates = allowedSlugs ?? getProductSlugs();
  if (!candidates.includes(normalized)) {
    throw new Error(`Unknown product slug "${slug}". Expected one of: ${candidates.join(", ")}`);
  }

  return normalized;
}

function readProductFile(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8");
  const sanitized = stripJsonComments(raw);
  const parsed = JSON.parse(sanitized);
  return productSchema.parse(parsed);
}

function resolveProductFile(slug: string): ProductFileResolution {
  const normalizedSlug = assertValidProductSlug(slug);
  const candidatePath = path.join(productsDir, `${normalizedSlug}${PRODUCT_FILE_EXTENSION}`);
  if (fs.existsSync(candidatePath)) {
    return {
      slug: normalizedSlug,
      absolutePath: candidatePath,
    };
  }

  throw new Error(
    `Missing product data for slug "${slug}". Expected ${path.relative(process.cwd(), candidatePath)}`,
  );
}

function loadProductFromFile(slug: string): ProductData {
  const resolution = resolveProductFile(slug);
  return readProductFile(resolution.absolutePath);
}

export function getProductSlugs(): string[] {
  if (!cachedSlugs) {
    if (!fs.existsSync(productsDir)) {
      cachedSlugs = [];
      return cachedSlugs;
    }

    const slugs = new Set<string>();

    for (const file of fs.readdirSync(productsDir)) {
      if (!file.toLowerCase().endsWith(PRODUCT_FILE_EXTENSION)) {
        continue;
      }

      const slug = file.replace(/\.json$/i, "");
      slugs.add(slug);
    }

    cachedSlugs = Array.from(slugs)
      .filter((slug) => !isExcludedSlug(slug))
      .sort((a, b) => a.localeCompare(b));
  }

  return cachedSlugs;
}

export function getProductData(slug?: string): ProductData {
  const slugs = getProductSlugs();
  const [firstSlug] = slugs;
  const targetSlug = slug ?? firstSlug;

  if (!targetSlug) {
    throw new Error("No product definitions found under data/products");
  }

  const normalizedSlug = assertValidProductSlug(targetSlug, slugs);

  if (productCache.has(normalizedSlug)) {
    return productCache.get(normalizedSlug)!;
  }

  const product = loadProductFromFile(normalizedSlug);
  productCache.set(normalizedSlug, product);
  return product;
}

export function getAllProducts(): ProductData[] {
  return getProductSlugs().map((slug) => getProductData(slug));
}

export function getProductJson(slug?: string, indent = 2): string {
  const product = getProductData(slug);
  return JSON.stringify(product, null, indent);
}

export function getProductsDataRoot(): string {
  return dataRoot;
}

export function getProductsDirectory(): string {
  return productsDir;
}

export function resolveProductFilePath(slug: string): ProductFileResolution {
  return resolveProductFile(slug);
}
