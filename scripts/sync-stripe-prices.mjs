#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Stripe from "stripe";
import dotenv from "dotenv";
import stripJsonComments from "strip-json-comments";

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const apiVersion = "2024-04-10";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const liveSecret = process.env.STRIPE_SECRET_KEY;
const testSecret = process.env.STRIPE_SECRET_KEY_TEST;

if (!liveSecret && !testSecret) {
  console.error("⚠️  STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST must be set.");
  process.exit(1);
}

const clients = [];
if (liveSecret) {
  clients.push({ mode: "live", stripe: new Stripe(liveSecret, { apiVersion }) });
}
if (testSecret) {
  clients.push({ mode: "test", stripe: new Stripe(testSecret, { apiVersion }) });
}
const zeroDecimalCurrencies = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

async function fetchPrice(priceId) {
  let lastError = null;

  for (const client of clients) {
    try {
      const price = await client.stripe.prices.retrieve(String(priceId));
      return { price, mode: client.mode };
    } catch (error) {
      lastError = error;
      if (error && error.code === "resource_missing") {
        continue;
      }
      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Unable to retrieve price ${priceId}`);
}

function formatAmount(unitAmount, currency) {
  if (typeof unitAmount !== "number") {
    throw new Error("unit_amount is missing for price");
  }
  const upperCurrency = currency?.toUpperCase?.();
  if (!upperCurrency) {
    throw new Error("currency is missing for price");
  }

  const divisor = zeroDecimalCurrencies.has(upperCurrency) ? 1 : 100;
  const amount = unitAmount / divisor;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: upperCurrency,
  }).format(amount);
}

async function main() {
  const productsDir = path.resolve(process.cwd(), "apps/store/data/products");
  const manifestPath = path.resolve(process.cwd(), "apps/store/data/prices/manifest.json");

  if (!fs.existsSync(productsDir)) {
    console.error(`⚠️  Products directory not found at ${productsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(productsDir).filter((file) => file.toLowerCase().endsWith(".json"));
  if (!files.length) {
    console.log("ℹ️  No product JSON files found. Nothing to sync.");
    return;
  }

  const manifestRaw = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, "utf8") : "{}";
  let manifest = {};

  try {
    manifest = JSON.parse(manifestRaw);
  } catch (error) {
    console.error(`❌  Failed to parse manifest at ${manifestPath}.`, error);
    process.exit(1);
  }

  if (!isRecord(manifest)) {
    console.error(`❌  Manifest at ${manifestPath} is not an object.`);
    process.exit(1);
  }

  let updatedEntries = 0;

  for (const file of files) {
    const absolutePath = path.join(productsDir, file);
    const raw = fs.readFileSync(absolutePath, "utf8");
    let product;

    try {
      product = JSON.parse(stripJsonComments(raw));
    } catch (error) {
      console.error(`❌  ${file}: failed to parse JSON (${error instanceof Error ? error.message : String(error)}).`);
      process.exitCode = 1;
      continue;
    }

    if (!isRecord(product)) {
      console.log(`ℹ️  ${file}: product content is not an object, skipping.`);
      continue;
    }

    const paymentStripe = isRecord(product.payment) && isRecord(product.payment.stripe)
      ? product.payment.stripe
      : null;
    const stripe = paymentStripe ?? (isRecord(product.stripe) ? product.stripe : null);
    if (!stripe) {
      console.log(`ℹ️  ${file}: no stripe block, skipping.`);
      continue;
    }

    const priceId = typeof stripe.price_id === "string" ? stripe.price_id.trim() : "";
    if (!priceId || priceId.toUpperCase() === "PLACEHOLDER" || !priceId.startsWith("price_")) {
      console.log(`ℹ️  ${file}: stripe.price_id not set to a real Stripe price, skipping.`);
      continue;
    }

    try {
      const slug = typeof product.slug === "string" ? product.slug.trim() : "";
      if (!slug) {
        console.log(`ℹ️  ${file}: missing product slug, skipping.`);
        continue;
      }

      const { price, mode } = await fetchPrice(priceId);
      const formatted = formatAmount(price.unit_amount, price.currency);
      const existingEntry = isRecord(manifest[slug]) ? manifest[slug] : null;
      const existingStripe = existingEntry && isRecord(existingEntry.stripe) ? existingEntry.stripe : {};
      const isUpToDate =
        existingEntry
        && existingEntry.unit_amount === price.unit_amount
        && existingEntry.currency === price.currency
        && (
          (mode === "live" && existingStripe.live_price_id === priceId)
          || (mode === "test" && existingStripe.test_price_id === priceId)
        );

      if (isUpToDate) {
        console.log(`✅  ${file}: manifest already up to date (${formatted}).`);
        continue;
      }

      const nextEntry = isRecord(existingEntry) ? { ...existingEntry } : {};
      nextEntry.slug = slug;
      nextEntry.provider = nextEntry.provider ?? "stripe";
      const inferredMode = product.payment?.mode ?? product.payment?.stripe?.mode;
      if (inferredMode) {
        nextEntry.mode = inferredMode;
      }
      if (product.payment?.account) {
        nextEntry.account = product.payment.account;
      }
      nextEntry.currency = price.currency;
      nextEntry.unit_amount = price.unit_amount;
      nextEntry.stripe = isRecord(nextEntry.stripe) ? { ...nextEntry.stripe } : {};
      if (mode === "live") {
        nextEntry.stripe.live_price_id = priceId;
      } else if (mode === "test") {
        nextEntry.stripe.test_price_id = priceId;
      }

      manifest[slug] = nextEntry;
      updatedEntries += 1;
      console.log(`📝  ${file}: manifest updated to ${formatted}.`);
    } catch (error) {
      console.error(`❌  ${file}: failed to update price.`, error);
      process.exitCode = 1;
    }
  }

  const sorted = Object.keys(manifest)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = manifest[key];
      return acc;
    }, {});

  fs.writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);

  if (updatedEntries === 0) {
    console.log("✨ Stripe price sync complete – no manifest changes detected.");
  } else {
    console.log(`✨ Stripe price sync complete – updated ${updatedEntries} manifest entr${updatedEntries === 1 ? "y" : "ies"}.`);
  }
}

await main();
