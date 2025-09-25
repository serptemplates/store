#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";

const rootDir = process.cwd();
const productsDir = path.join(rootDir, "apps", "store", "data", "products");

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

let updated = 0;
const files = fs
  .readdirSync(productsDir)
  .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"));

for (const file of files) {
  const filePath = path.join(productsDir, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const data = parse(raw);

  const slug = data?.slug ?? file.replace(/\.ya?ml$/i, "");
  const categories = toArray(data?.categories);

  const collections = new Set(toArray(data?.shopify_collections));

  if (slug.includes("downloader")) {
    collections.add("Downloaders");
  }

  if (categories.some((category) => typeof category === "string" && category.includes("Artificial Intelligence"))) {
    collections.add("Artificial Intelligence");
  }

  const nextCollections = Array.from(collections).filter(Boolean);

  if (nextCollections.length === 0) {
    if (data?.shopify_collections) {
      delete data.shopify_collections;
      const output = stringify(data, { lineWidth: 0 });
      fs.writeFileSync(filePath, output, "utf8");
      updated += 1;
    }
    continue;
  }

  const existing = Array.isArray(data?.shopify_collections)
    ? data.shopify_collections
    : data?.shopify_collections
      ? [data.shopify_collections]
      : [];

  const normalizedExisting = existing.slice().sort();
  const normalizedNext = nextCollections.slice().sort();

  const isSame = normalizedExisting.length === normalizedNext.length && normalizedExisting.every((value, index) => value === normalizedNext[index]);

  if (isSame) {
    continue;
  }

  data.shopify_collections = nextCollections;
  const output = stringify(data, { lineWidth: 0 });
  fs.writeFileSync(filePath, output, "utf8");
  updated += 1;
}

console.info(`Applied shopify_collections to ${updated} product files.`);
