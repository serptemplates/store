#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");
const PRODUCTS_DIR = path.join(REPO_ROOT, "apps/store/data/products");

function isRecord(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isInternalCheckoutHref(href) {
  return (
    typeof href === "string" &&
    (href.startsWith("/checkout/") || href.startsWith("https://apps.serp.co/checkout/"))
  );
}

function main() {
  const entries = fs.readdirSync(PRODUCTS_DIR, { withFileTypes: true });
  const changed = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const filePath = path.join(PRODUCTS_DIR, entry.name);
    let json;
    try {
      json = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (err) {
      console.warn(`Skipping invalid JSON: ${filePath}`);
      continue;
    }

    if (json?.status !== "live") continue;

    const pricing = isRecord(json.pricing) ? json.pricing : null;
    const ctaHref = pricing?.cta_href;
    if (!isInternalCheckoutHref(ctaHref)) continue;

    if (Object.prototype.hasOwnProperty.call(json, "payment_link")) {
      delete json.payment_link;
      fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
      changed.push(entry.name);
      console.log(`🧹 Removed payment_link from ${entry.name}`);
    }
  }

  console.log(`\nDone. Updated ${changed.length} file(s).`);
}

main();

