#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import Stripe from "stripe";
import { parse } from "csv-parse/sync";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeSecretTest = process.env.STRIPE_SECRET_KEY_TEST;
const cleanupEnv = (process.env.STRIPE_CLEANUP_ENV || "").toLowerCase();

let selectedKey = null;
let mode = "live";
if (cleanupEnv === "test") {
  if (stripeSecretTest) {
    selectedKey = stripeSecretTest;
    mode = "test";
  } else if (stripeSecret) {
    selectedKey = stripeSecret;
    mode = "live";
  }
} else if (cleanupEnv === "live") {
  if (stripeSecret) {
    selectedKey = stripeSecret;
    mode = "live";
  } else if (stripeSecretTest) {
    selectedKey = stripeSecretTest;
    mode = "test";
  }
} else {
  if (stripeSecret) {
    selectedKey = stripeSecret;
    mode = "live";
  } else if (stripeSecretTest) {
    selectedKey = stripeSecretTest;
    mode = "test";
  }
}

if (!selectedKey) {
  console.error("⚠️  STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST must be set.");
  process.exit(1);
}

const stripe = new Stripe(selectedKey, { apiVersion: "2024-04-10" });

const productsCsvDefault = path.resolve("products.csv");
const productsCsvLive = path.resolve("products_live.csv");
const ghlProductsPath = path.resolve("ghl-products.json");

const productsCsvPath = mode === "live" && fs.existsSync(productsCsvLive)
  ? productsCsvLive
  : productsCsvDefault;

if (!fs.existsSync(productsCsvPath)) {
  console.error(`⚠️  Missing ${productsCsvPath}.`);
  process.exit(1);
}

if (!fs.existsSync(ghlProductsPath)) {
  console.error(`⚠️  Missing ${ghlProductsPath}.`);
  process.exit(1);
}

const csvRows = parse(fs.readFileSync(productsCsvPath, "utf8"), { columns: true, skip_empty_lines: true });
const ghlData = JSON.parse(fs.readFileSync(ghlProductsPath, "utf8"));
const ghlProducts = ghlData.products || [];

const slugify = (value = "") => value.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const ghlSlugs = new Set(
  ghlProducts.map((item) => (item.raw?.slug) || slugify(item.name || "")).filter(Boolean)
);

const groups = new Map();
for (const row of csvRows) {
  const slug = slugify(row["Name"] || row.name || "");
  if (!slug) continue;
  const dateRaw = row["Date (UTC)"] || row.date || "";
  const timestamp = dateRaw ? Date.parse(dateRaw.replace(/Z$/, "")) || 0 : 0;
  if (!groups.has(slug)) groups.set(slug, []);
  groups.get(slug).push({ row, timestamp });
}

const toArchive = new Map();
const keepers = new Map();

for (const [slug, entries] of groups.entries()) {
  const sorted = entries.slice().sort((a, b) => b.timestamp - a.timestamp);
  const keepEntry = sorted[0];
  const keepId = keepEntry?.row?.id;
  if (keepId && keepId.startsWith("prod_")) {
    keepers.set(keepId, { slug, reason: ghlSlugs.has(slug) ? "latest" : "latest-but-not-in-ghl" });
  }

  const slugInGhl = ghlSlugs.has(slug);
  const archiveReason = slugInGhl ? "older-duplicate" : "not-in-ghl";

  sorted.forEach((entry, index) => {
    const productId = entry.row.id;
    if (!productId || !productId.startsWith("prod_")) return;
    if (index === 0 && slugInGhl) return;
    if (keepers.has(productId)) return;
    toArchive.set(productId, { slug, reason: archiveReason });
  });
}

if (!toArchive.size) {
  console.log("No Stripe products to archive based on current data.");
  process.exit(0);
}

console.log(`Stripe cleanup starting in ${mode} mode.`);
console.log(`Identified ${toArchive.size} product(s) to archive.`);

let success = 0;
let skipped = 0;
let failed = 0;

for (const [productId, info] of toArchive.entries()) {
  try {
    const product = await stripe.products.update(productId, { active: false });
    console.log(` ✅ Archived ${product.id} (slug: ${info.slug}, reason: ${info.reason})`);
    success += 1;
  } catch (error) {
    if (error?.code === "resource_missing") {
      console.log(` ⚠️  ${productId} not found (perhaps already deleted).`);
      skipped += 1;
    } else {
      console.error(` ❌  Failed to archive ${productId}:`, error.message || error);
      failed += 1;
    }
  }
}

console.log("\nCleanup summary:");
console.log(` Archived: ${success}`);
console.log(` Skipped (missing): ${skipped}`);
console.log(` Failed: ${failed}`);
console.log(" Done.");
