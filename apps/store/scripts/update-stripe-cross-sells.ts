#!/usr/bin/env tsx
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import Stripe from "stripe";
import dotenv from "dotenv";
import { parse } from "yaml";

const API_VERSION = "2025-06-30.basil" as unknown as Stripe.LatestApiVersion;
const REPO_ROOT = path.resolve(__dirname, "../../..");
const PRODUCTS_DIR = path.join(REPO_ROOT, "apps/store/data/products");

const CROSS_SELL_TARGETS: Partial<Record<StripeMode, string>> = {
  live: "prod_TF3OkFaJi31aur", // SERP Downloaders Bundle
};

function loadEnvFiles() {
  const candidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.join(REPO_ROOT, ".env.local"),
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

type ProductYaml = {
  slug?: unknown;
  name?: unknown;
  stripe?: {
    metadata?: Record<string, unknown> | null | undefined;
  };
};

function shouldUpdateProduct(slug: string, name: string | undefined) {
  const loweredSlug = slug.toLowerCase();
  const loweredName = name?.toLowerCase() ?? "";

  if (loweredSlug === "serp-downloaders-bundle") {
    return false;
  }

  return loweredSlug.includes("downloader") || loweredName.includes("downloader");
}

async function updateStripeCrossSells() {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    throw new Error(`Products directory not found at ${PRODUCTS_DIR}`);
  }

  const files = fs.readdirSync(PRODUCTS_DIR).filter((file) => /\.ya?ml$/i.test(file));
  if (files.length === 0) {
    console.log("No product YAML files found. Nothing to update.");
    return;
  }

  const clients = createStripeClients();
  let productsProcessed = 0;
  let updatesAttempted = 0;
  let updatesApplied = 0;

  for (const file of files) {
    const absolutePath = path.join(PRODUCTS_DIR, file);
    const raw = fs.readFileSync(absolutePath, "utf8");
    const data = parse(raw) as ProductYaml;

    const slug = typeof data.slug === "string" ? data.slug : file.replace(/\.ya?ml$/i, "");
    const name = typeof data.name === "string" ? data.name : undefined;
    const stripeProductId = typeof data.stripe?.metadata?.stripe_product_id === "string"
      ? data.stripe?.metadata?.stripe_product_id.trim()
      : undefined;

    if (!stripeProductId) {
      continue;
    }

    if (!shouldUpdateProduct(slug, name)) {
      continue;
    }

    productsProcessed += 1;

    for (const client of clients) {
      const crossSellTarget = CROSS_SELL_TARGETS[client.mode];
      if (!crossSellTarget) {
        console.log(`⚪️  [${client.mode}] ${slug}: skipping (no cross-sell target configured).`);
        continue;
      }

      updatesAttempted += 1;

      try {
        await client.stripe.products.update(stripeProductId, {
          cross_sells: [crossSellTarget],
        } as Stripe.ProductUpdateParams);

        updatesApplied += 1;
        console.log(`✅ [${client.mode}] ${slug} (${stripeProductId}) cross-sells -> ${crossSellTarget}`);
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
