#!/usr/bin/env node
/**
 * Ensures Coursera Downloader is live and billed at $17/mo (live + test) in Stripe,
 * then syncs product JSON + price manifest and runs product normalization/validation.
 *
 * Note: This script requires network access to Stripe.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import dotenv from "dotenv";
import stripJsonComments from "strip-json-comments";
import Stripe from "stripe";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const apiVersion = "2024-04-10";
const slug = "coursera-downloader";
const amount = 1700;
const currency = "usd";

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    console.error(`Missing ${name} in .env`);
    process.exit(1);
  }
  return String(value).trim();
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status ?? "unknown"}`);
  }
}

function readJsonWithComments(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(stripJsonComments(raw));
}

async function findOrCreateMonthlyPrice(stripe, productId) {
  const existing = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const found = existing.data.find(
    (price) =>
      price.currency === currency &&
      price.unit_amount === amount &&
      price.recurring?.interval === "month",
  );
  if (found) {
    return { priceId: found.id, created: false };
  }

  const created = await stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency,
    recurring: { interval: "month" },
    nickname: `${slug} monthly`,
  });

  return { priceId: created.id, created: true };
}

async function findOrCreateTestProductId(stripe) {
  // Prefer search if enabled.
  try {
    const result = await stripe.products.search({
      query: `metadata['product_slug']:'${slug}'`,
      limit: 1,
    });
    const found = result.data?.[0];
    if (found?.id) return found.id;
  } catch {
    // Ignore and create.
  }

  const created = await stripe.products.create({
    name: "Coursera Downloader",
    metadata: {
      product_slug: slug,
      source: "store-product-json",
    },
  });
  return created.id;
}

async function ensureProductExists(stripe, productId, fallbackName) {
  if (typeof productId === "string" && productId.trim()) {
    try {
      const existing = await stripe.products.retrieve(productId.trim());
      return existing.id;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code !== "resource_missing") {
        throw error;
      }
      // Fall through and create.
    }
  }

  const created = await stripe.products.create({
    name: fallbackName,
    description: "Coursera Downloader",
    metadata: {
      product_slug: slug,
      source: "store-product-json",
    },
  });
  return created.id;
}

async function main() {
  const liveKey = requireEnv("STRIPE_SECRET_KEY");
  const testKey = requireEnv("STRIPE_SECRET_KEY_TEST");
  const stripeLive = new Stripe(liveKey, { apiVersion });
  const stripeTest = new Stripe(testKey, { apiVersion });

  const productPath = path.resolve("apps/store/data/products", `${slug}.json`);
  const manifestPath = path.resolve("apps/store/data/prices/manifest.json");

  const product = readJsonWithComments(productPath);
  const stripeMeta = product?.payment?.stripe?.metadata ?? {};
  const desiredName = typeof product?.name === "string" && product.name.trim()
    ? product.name.trim()
    : "Coursera Downloader";

  const liveProductId = await ensureProductExists(stripeLive, stripeMeta.stripe_product_id, desiredName);
  const testProductId = await ensureProductExists(
    stripeTest,
    stripeMeta.stripe_test_product_id ?? (await findOrCreateTestProductId(stripeTest)),
    desiredName,
  );

  const [livePrice, testPrice] = await Promise.all([
    findOrCreateMonthlyPrice(stripeLive, liveProductId),
    findOrCreateMonthlyPrice(stripeTest, testProductId),
  ]);

  // Update product JSON
  product.status = "live";
  product.payment = product.payment ?? { provider: "stripe" };
  product.payment.provider = "stripe";
  product.payment.mode = "subscription";
  product.payment.stripe = product.payment.stripe ?? {};
  product.payment.stripe.price_id = livePrice.priceId;
  product.payment.stripe.test_price_id = testPrice.priceId;
  product.payment.stripe.metadata = product.payment.stripe.metadata ?? {};
  product.payment.stripe.metadata.stripe_product_id = liveProductId;
  product.payment.stripe.metadata.stripe_test_product_id = testProductId;

  fs.writeFileSync(productPath, `${JSON.stringify(product, null, 2)}\n`, "utf8");

  // Update price manifest
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
  manifest[slug] = {
    slug,
    provider: "stripe",
    mode: "subscription",
    currency,
    unit_amount: amount,
    stripe: {
      live_price_id: livePrice.priceId,
      test_price_id: testPrice.priceId,
    },
  };

  const sorted = Object.keys(manifest)
    .sort()
    .reduce((acc, key) => {
      acc[key] = manifest[key];
      return acc;
    }, {});
  fs.writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

  // Normalize + validate product data
  run("pnpm", ["--filter", "@apps/store", "convert:products", "--slug", slug]);
  run("pnpm", ["--filter", "@apps/store", "validate:products"]);

  const output = {
    processedAt: new Date().toISOString(),
    slug,
    live: { productId: liveProductId, ...livePrice },
    test: { productId: testProductId, ...testPrice },
  };
  fs.writeFileSync(path.resolve("tmp/stripe-coursera-17mo.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log("Done:", output);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
