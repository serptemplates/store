#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import Stripe from "stripe";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const preferredEnv = (process.env.STRIPE_CREATE_PRICES_ENV || '').toLowerCase();
let selectedKey = null;
let mode = 'live';
if (preferredEnv === 'test') {
  if (process.env.STRIPE_SECRET_KEY_TEST) {
    selectedKey = process.env.STRIPE_SECRET_KEY_TEST;
    mode = 'test';
  } else if (process.env.STRIPE_SECRET_KEY) {
    selectedKey = process.env.STRIPE_SECRET_KEY;
    mode = 'live';
  }
} else if (preferredEnv === 'live') {
  if (process.env.STRIPE_SECRET_KEY) {
    selectedKey = process.env.STRIPE_SECRET_KEY;
    mode = 'live';
  } else if (process.env.STRIPE_SECRET_KEY_TEST) {
    selectedKey = process.env.STRIPE_SECRET_KEY_TEST;
    mode = 'test';
  }
} else {
  if (process.env.STRIPE_SECRET_KEY) {
    selectedKey = process.env.STRIPE_SECRET_KEY;
    mode = 'live';
  } else if (process.env.STRIPE_SECRET_KEY_TEST) {
    selectedKey = process.env.STRIPE_SECRET_KEY_TEST;
    mode = 'test';
  }
}

if (!selectedKey) {
  console.error('⚠️  STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST must be set.');
  process.exit(1);
}

console.log(`Using Stripe ${mode} API key`);
const stripe = new Stripe(selectedKey, { apiVersion: '2024-04-10' });

const canonicalCsvPath = path.resolve("product-canonical-map.csv");
if (!fs.existsSync(canonicalCsvPath)) {
  console.error("⚠️  product-canonical-map.csv is missing. Run earlier steps first.");
  process.exit(1);
}

const canonicalRows = parse(fs.readFileSync(canonicalCsvPath, "utf8"), {
  columns: true,
  skip_empty_lines: true,
});

const skipSlugs = new Set([
  "skool-video-downloader",
  "serp-affiliates-course",
  "serp-blocks",
  "serpuniversity-pro",
  "vimeo-video-downloader",
  "loom-video-downloader",
  "ai-voice-cloner",
]);

const defaultAmount = Number.parseInt(process.env.STRIPE_PRICE_DEFAULT_AMOUNT || "1700", 10);
const defaultCurrency = (process.env.STRIPE_PRICE_DEFAULT_CURRENCY || "usd").toLowerCase();

const targetRows = canonicalRows.filter((row) => {
  if (!row.slug || !row.product_id) return false;
  if (skipSlugs.has(row.slug)) return false;
  return true;
});

if (!targetRows.length) {
  console.log("No products to process.");
  process.exit(0);
}

console.log(`Processing ${targetRows.length} product(s)`);

const results = [];

for (const row of targetRows) {
  const slug = row.slug;
  const productId = row.product_id;

  try {
    const existing = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
    });

    const found = existing.data.find(
      (price) =>
        price.currency === defaultCurrency &&
        price.unit_amount === defaultAmount &&
        price.recurring == null
    );

    if (found) {
      console.log(`✔︎ ${slug}: existing price ${found.id}`);
      results.push({ slug, productId, priceId: found.id, created: false });
      continue;
    }

    const created = await stripe.prices.create({
      product: productId,
      unit_amount: defaultAmount,
      currency: defaultCurrency,
      nickname: slug,
    });

    console.log(`➕ ${slug}: created price ${created.id}`);
    results.push({ slug, productId, priceId: created.id, created: true });
  } catch (error) {
    console.error(`❌ ${slug}: ${error.message || error}`);
    results.push({ slug, productId, priceId: null, created: false, error: error.message || String(error) });
  }
}

const outputPath = path.resolve("stripe-price-results.json");
fs.writeFileSync(outputPath, JSON.stringify({
  processedAt: new Date().toISOString(),
  amount: defaultAmount,
  currency: defaultCurrency,
  results,
}, null, 2));
console.log(`\nWrote summary to ${outputPath}`);
