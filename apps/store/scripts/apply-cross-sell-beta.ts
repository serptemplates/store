#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { URLSearchParams } from "node:url";
import dotenv from "dotenv";
import { getAllProducts } from "@/lib/products/product";
import type { ProductData } from "@/lib/products/product-schema";

const repoRootEnv = path.resolve(process.cwd(), "..", "..", ".env");
const localEnv = path.resolve(process.cwd(), ".env");
for (const candidate of [repoRootEnv, localEnv]) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
  }
}

const STRIPE_BETA_VERSION = "2025-06-30.basil; checkout_cross_sells_beta=v1";

type StripeMode = "live" | "test";

type ModeConfig = {
  mode: StripeMode;
  secretKey: string;
  targetProductId?: string;
};

function resolveModeConfigs(): ModeConfig[] {
  const configs: ModeConfig[] = [];
  const liveKey = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
  if (liveKey?.startsWith("sk_live_")) {
    configs.push({
      mode: "live",
      secretKey: liveKey,
      targetProductId:
        process.env.STRIPE_CROSS_SELL_DOWNLOADERS_PRODUCT_ID_LIVE
        || process.env.STRIPE_CROSS_SELL_ALL_BUNDLE_PRODUCT_ID_LIVE
        || process.env.STRIPE_CROSS_SELL_ADULT_BUNDLE_PRODUCT_ID_LIVE,
    });
  }

  const testKey =
    process.env.STRIPE_SECRET_KEY_TEST
    || process.env.STRIPE_TEST_SECRET_KEY
    || process.env.STRIPE_SECRET_KEY;
  if (testKey?.startsWith("sk_test_")) {
    configs.push({
      mode: "test",
      secretKey: testKey,
      targetProductId:
        process.env.STRIPE_CROSS_SELL_DOWNLOADERS_PRODUCT_ID_TEST
        || process.env.STRIPE_CROSS_SELL_ALL_BUNDLE_PRODUCT_ID_TEST
        || process.env.STRIPE_CROSS_SELL_ADULT_BUNDLE_PRODUCT_ID_TEST,
    });
  }

  return configs;
}

function isDownloader(product: ProductData): boolean {
  const slug = product.slug?.toLowerCase() ?? "";
  const name = product.name?.toLowerCase() ?? "";
  if (slug.includes("downloader") || name.includes("downloader")) {
    return true;
  }
  const categories = product.categories ?? [];
  return categories.some((category) => category?.toLowerCase().includes("downloader"));
}

async function postStripe(
  secretKey: string,
  productId: string,
  targetProductId: string,
): Promise<Response> {
  const body = new URLSearchParams();
  body.append("cross_sells[0]", targetProductId);

  return fetch(`https://api.stripe.com/v1/products/${productId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": STRIPE_BETA_VERSION,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

async function applyCrossSells() {
  const modeConfigs = resolveModeConfigs();
  if (modeConfigs.length === 0) {
    console.error("No Stripe secret keys detected. Aborting.");
    process.exit(1);
  }

  const products = getAllProducts().filter((p) => p.status === "live" && isDownloader(p));
  if (products.length === 0) {
    console.log("No downloader products found. Nothing to update.");
    return;
  }

  let updatesAttempted = 0;
  let updatesSucceeded = 0;

  for (const product of products) {
    const productId = product.stripe?.metadata?.stripe_product_id;
    if (!productId) {
      console.warn(`⚪️  ${product.slug}: missing stripe_product_id, skipping.`);
      continue;
    }

    for (const cfg of modeConfigs) {
      if (!cfg.targetProductId) {
        console.warn(`⚪️  [${cfg.mode}] ${product.slug}: no target product configured, skipping.`);
        continue;
      }

      updatesAttempted += 1;
      try {
        const response = await postStripe(cfg.secretKey, productId, cfg.targetProductId);
        if (!response.ok) {
          const errorPayload = await response.text();
          console.error(`❌ [${cfg.mode}] ${product.slug}: ${response.status} ${response.statusText}`);
          console.error(`   ${errorPayload}`);
          continue;
        }
        updatesSucceeded += 1;
        console.log(`✅ [${cfg.mode}] ${product.slug} -> cross-sells ${cfg.targetProductId}`);
      } catch (error) {
        console.error(`❌ [${cfg.mode}] ${product.slug}: ${(error as Error).message}`);
      }
    }
  }

  console.log("");
  console.log(`Updates attempted: ${updatesAttempted}`);
  console.log(`Updates succeeded: ${updatesSucceeded}`);
}

applyCrossSells().catch((error) => {
  console.error("Unhandled error while applying cross-sells.");
  console.error(error);
  process.exit(1);
});
