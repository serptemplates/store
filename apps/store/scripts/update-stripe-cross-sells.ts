#!/usr/bin/env tsx
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import Stripe from "stripe";
import dotenv from "dotenv";
import { getAllProducts } from "../lib/products/product";

const API_VERSION = "2025-06-30.basil" as unknown as Stripe.LatestApiVersion;
const REPO_ROOT = path.resolve(__dirname, "../../..");

type CrossSellConfig = {
  allBundleProductId?: string; // e.g., SERP Downloaders Bundle (all-downloaders)
  adultBundleProductId?: string; // e.g., SERP Adult Downloaders Bundle
};

function resolveCrossSellConfig(mode: StripeMode): CrossSellConfig {
  if (mode === "live") {
    return {
      allBundleProductId:
        process.env.STRIPE_CROSS_SELL_ALL_BUNDLE_PRODUCT_ID_LIVE ||
        "prod_TF3OkFaJi31aur", // fallback to current all-downloaders bundle
      adultBundleProductId: process.env.STRIPE_CROSS_SELL_ADULT_BUNDLE_PRODUCT_ID_LIVE,
    };
  }

  return {
    allBundleProductId: process.env.STRIPE_CROSS_SELL_ALL_BUNDLE_PRODUCT_ID_TEST,
    adultBundleProductId: process.env.STRIPE_CROSS_SELL_ADULT_BUNDLE_PRODUCT_ID_TEST,
  };
}

function loadEnvFiles() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.join(REPO_ROOT, ".env"),
  ];

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (!seen.has(candidate) && fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      seen.add(candidate);
    }
  }
}

loadEnvFiles();

type StripeMode = "live" | "test";
type StripeClient = { mode: StripeMode; stripe: Stripe };

function resolveStripeSecret(mode: StripeMode): string | undefined {
  if (mode === "live") {
    if (process.env.STRIPE_SECRET_KEY_LIVE && process.env.STRIPE_SECRET_KEY_LIVE.startsWith("sk_live_")) {
      return process.env.STRIPE_SECRET_KEY_LIVE;
    }
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_live_")) {
      return process.env.STRIPE_SECRET_KEY;
    }
    return undefined;
  }

  const candidates = [
    process.env.STRIPE_SECRET_KEY_TEST,
    process.env.STRIPE_TEST_SECRET_KEY,
    process.env.STRIPE_SECRET_KEY,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.startsWith("sk_test_")) {
      return candidate;
    }
  }

  return undefined;
}

function createStripeClients(): StripeClient[] {
  const clients: StripeClient[] = [];
  const liveSecret = resolveStripeSecret("live");
  const testSecret = resolveStripeSecret("test");

  if (liveSecret) {
    clients.push({ mode: "live", stripe: new Stripe(liveSecret, { apiVersion: API_VERSION }) });
  }

  if (testSecret) {
    clients.push({ mode: "test", stripe: new Stripe(testSecret, { apiVersion: API_VERSION }) });
  }

  if (clients.length === 0) {
    throw new Error(
      "No Stripe secret keys found. Set STRIPE_SECRET_KEY_LIVE / STRIPE_SECRET_KEY_TEST or equivalent environment variables.",
    );
  }

  return clients;
}

function shouldUpdateProduct(slug: string, name: string | undefined, status?: string) {
  const loweredSlug = slug.toLowerCase();
  const loweredName = name?.toLowerCase() ?? "";

  if (loweredSlug === "serp-downloaders-bundle") {
    return false;
  }

  // Skip obvious bundle products by name as a safety
  if (loweredSlug.includes("bundle") || loweredName.includes("bundle")) {
    return false;
  }

  // Skip pre-release products (no checkout yet)
  if (status === "pre_release") {
    return false;
  }

  return loweredSlug.includes("downloader") || loweredName.includes("downloader");
}

async function updateStripeCrossSells() {
  const products = getAllProducts();
  if (products.length === 0) {
    console.log("No product records found. Nothing to update.");
    return;
  }

  const clients = createStripeClients();
  let productsProcessed = 0;
  let updatesAttempted = 0;
  let updatesApplied = 0;

  for (const product of products) {
    const slug = product.slug;
    const name = product.name;
    const status = product.status;
    const stripeProductId =
      typeof product.stripe?.metadata?.stripe_product_id === "string"
        ? product.stripe.metadata.stripe_product_id.trim()
        : undefined;

    if (!stripeProductId) {
      continue;
    }

    if (!shouldUpdateProduct(slug, name, status)) {
      continue;
    }

    productsProcessed += 1;

    // Determine if this product is marked as Adult via categories
    const isAdult = (product.categories || []).some((c) => c?.toLowerCase() === "adult");

    for (const client of clients) {
      const cfg = resolveCrossSellConfig(client.mode);
      const target = isAdult ? cfg.adultBundleProductId : cfg.allBundleProductId;
      if (!target) {
        const reason = isAdult ? "no adult bundle configured" : "no all-downloaders bundle configured";
        console.log(`⚪️  [${client.mode}] ${slug}: skipping (${reason}).`);
        continue;
      }

      updatesAttempted += 1;

      try {
        await client.stripe.products.update(stripeProductId, {
          cross_sells: [target],
        } as Stripe.ProductUpdateParams);

        updatesApplied += 1;
        console.log(`✅ [${client.mode}] ${slug} (${stripeProductId}) cross-sells -> ${target}`);
      } catch (error) {
        const stripeError = error as Stripe.errors.StripeError;

        if (stripeError?.code === "resource_missing") {
          console.warn(`⚠️  [${client.mode}] ${slug}: product ${stripeProductId} not found (skipping).`);
          continue;
        }

        console.error(`❌ [${client.mode}] ${slug}: failed to update cross-sells.`);
        if (stripeError?.message) {
          console.error(`   Reason: ${stripeError.message}`);
        }
        process.exitCode = 1;
      }
    }
  }

  console.log("");
  console.log(`Products processed: ${productsProcessed}`);
  console.log(`Cross-sell updates attempted: ${updatesAttempted}`);
  console.log(`Cross-sell updates applied: ${updatesApplied}`);
}

updateStripeCrossSells().catch((error) => {
  console.error("Unhandled error while updating Stripe cross-sells.");
  console.error(error);
  process.exit(1);
});
