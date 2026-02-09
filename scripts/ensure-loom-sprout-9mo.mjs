#!/usr/bin/env node
/**
 * Creates NEW $9/mo recurring prices (live + test) for Loom + Sprout downloaders in Stripe,
 * then updates product JSON + price manifest and runs product normalization/validation.
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
const currency = "usd";
const unitAmount = 900;

const products = [
  { slug: "loom-video-downloader", fallbackName: "Loom Video Downloader" },
  { slug: "sprout-video-downloader", fallbackName: "Sprout Video Downloader" },
];

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

async function ensureProductExists(stripe, productId, fallbackName, slug) {
  if (typeof productId === "string" && productId.trim()) {
    try {
      const existing = await stripe.products.retrieve(productId.trim());
      return existing.id;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code !== "resource_missing") {
        throw error;
      }
    }
  }

  const created = await stripe.products.create({
    name: fallbackName,
    metadata: {
      product_slug: slug,
      source: "store-product-json",
    },
  });
  return created.id;
}

async function createMonthlyPrice(stripe, productId, slug) {
  const created = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency,
    recurring: { interval: "month" },
    nickname: `${slug} $9/mo ${new Date().toISOString().slice(0, 10)}`,
  });
  return created.id;
}

async function main() {
  const liveKey = requireEnv("STRIPE_SECRET_KEY");
  const testKey = requireEnv("STRIPE_SECRET_KEY_TEST");
  const stripeLive = new Stripe(liveKey, { apiVersion });
  const stripeTest = new Stripe(testKey, { apiVersion });

  const manifestPath = path.resolve("apps/store/data/prices/manifest.json");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};

  const receipt = {
    processedAt: new Date().toISOString(),
    unitAmount,
    currency,
    products: {},
  };

  for (const { slug, fallbackName } of products) {
    const productPath = path.resolve("apps/store/data/products", `${slug}.json`);
    const product = readJsonWithComments(productPath);
    const desiredName =
      typeof product?.name === "string" && product.name.trim() ? product.name.trim() : fallbackName;
    const stripeMeta = product?.payment?.stripe?.metadata ?? {};

    const liveProductId = await ensureProductExists(
      stripeLive,
      stripeMeta.stripe_product_id,
      desiredName,
      slug,
    );
    const testProductId = await ensureProductExists(
      stripeTest,
      stripeMeta.stripe_test_product_id,
      desiredName,
      slug,
    );

    // Explicitly create new prices (even if an existing $9/mo price already exists).
    const [livePriceId, testPriceId] = await Promise.all([
      createMonthlyPrice(stripeLive, liveProductId, slug),
      createMonthlyPrice(stripeTest, testProductId, slug),
    ]);

    // Update product JSON
    product.payment = product.payment ?? { provider: "stripe" };
    product.payment.provider = "stripe";
    product.payment.mode = "subscription";
    product.payment.stripe = product.payment.stripe ?? {};
    product.payment.stripe.price_id = livePriceId;
    product.payment.stripe.test_price_id = testPriceId;
    product.payment.stripe.metadata = product.payment.stripe.metadata ?? {};
    product.payment.stripe.metadata.stripe_product_id = liveProductId;
    product.payment.stripe.metadata.stripe_test_product_id = testProductId;

    fs.writeFileSync(productPath, `${JSON.stringify(product, null, 2)}\n`, "utf8");

    // Update price manifest
    manifest[slug] = {
      slug,
      provider: "stripe",
      mode: "subscription",
      currency,
      unit_amount: unitAmount,
      stripe: {
        live_price_id: livePriceId,
        test_price_id: testPriceId,
      },
    };

    receipt.products[slug] = {
      live: { productId: liveProductId, priceId: livePriceId },
      test: { productId: testProductId, priceId: testPriceId },
    };

    // Normalize + validate product data per slug so failures are localised.
    run("pnpm", ["--filter", "@apps/store", "convert:products", "--slug", slug]);
    run("pnpm", ["--filter", "@apps/store", "validate:products"]);
  }

  const sorted = Object.keys(manifest)
    .sort()
    .reduce((acc, key) => {
      acc[key] = manifest[key];
      return acc;
    }, {});
  fs.writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

  fs.mkdirSync(path.resolve("tmp"), { recursive: true });
  fs.writeFileSync(
    path.resolve("tmp/stripe-loom-sprout-9mo.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
    "utf8",
  );

  console.log("Done:", receipt);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});

