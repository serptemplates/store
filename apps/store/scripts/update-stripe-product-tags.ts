#!/usr/bin/env tsx
/* eslint-disable no-console */

import path from "node:path";
import process from "node:process";

import Stripe from "stripe";
import dotenv from "dotenv";
import fs from "node:fs";
import { getAllProducts } from "../lib/products/product";

const API_VERSION: Stripe.LatestApiVersion = "2024-04-10";
const REPO_ROOT = path.resolve(__dirname, "../../..");

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

async function updateStripeProducts() {
  const products = getAllProducts();
  if (products.length === 0) {
    console.log("No product records found. Nothing to update.");
    return;
  }

  const clients = createStripeClients();
  let updatesAttempted = 0;
  let updatesApplied = 0;
  let priceUpdatesAttempted = 0;
  let priceUpdatesApplied = 0;
  let priceWarnings = 0;

  for (const product of products) {
    const slug = product.slug;
    const tagIds = Array.isArray(product.ghl?.tag_ids) ? product.ghl?.tag_ids : [];
    const primaryTag = typeof tagIds[0] === "string" && tagIds[0].trim().length > 0 ? tagIds[0].trim() : undefined;
    const stripeProductId =
      typeof product.stripe?.metadata?.stripe_product_id === "string"
        ? product.stripe.metadata.stripe_product_id.trim()
        : undefined;
    const livePriceId =
      typeof product.stripe?.price_id === "string" ? product.stripe.price_id.trim() : undefined;
    const testPriceId =
      typeof product.stripe?.test_price_id === "string" ? product.stripe.test_price_id.trim() : undefined;
    const priceIds = [livePriceId, testPriceId].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );

    if (!primaryTag || !stripeProductId) {
      continue;
    }

    for (const client of clients) {
      updatesAttempted += 1;
      try {
        await client.stripe.products.update(stripeProductId, {
          metadata: {
            ghl_tag: primaryTag,
            product_slug: slug,
          },
        });
        updatesApplied += 1;
        console.log(`✅ [${client.mode}] ${slug} (${stripeProductId}) -> ghl_tag=${primaryTag}`);
      } catch (error) {
        const stripeError = error as Stripe.errors.StripeError;
        if (stripeError?.code === "resource_missing") {
          console.warn(`⚠️  [${client.mode}] ${slug}: product ${stripeProductId} not found (skipping).`);
          continue;
        }

        console.error(`❌ [${client.mode}] ${slug}: failed to update product metadata.`);
        if (stripeError?.message) {
          console.error(`   Reason: ${stripeError.message}`);
        }
        process.exitCode = 1;
      }

      if (priceIds.length === 0) {
        continue;
      }

      for (const priceId of priceIds) {
        priceUpdatesAttempted += 1;
        try {
          await client.stripe.prices.update(priceId, {
            metadata: {
              ghl_tag: primaryTag,
              product_slug: slug,
            },
          });
          priceUpdatesApplied += 1;
          console.log(`   ↳ 💰 [${client.mode}] price ${priceId} -> ghl_tag=${primaryTag}`);
        } catch (error) {
          const stripeError = error as Stripe.errors.StripeError;
          if (stripeError?.code === "resource_missing") {
            priceWarnings += 1;
            console.warn(
              `⚠️  [${client.mode}] ${slug}: price ${priceId} not found (skipping metadata update).`,
            );
            continue;
          }

          priceWarnings += 1;
          console.warn(
            `⚠️  [${client.mode}] ${slug}: failed to update price ${priceId} metadata (${stripeError?.message ?? "unknown error"}).`,
          );
        }
      }
    }
  }

  if (updatesAttempted === 0) {
    console.log("No products required metadata updates (missing GHL tags or Stripe product IDs).");
  } else if (updatesApplied === 0) {
    console.warn("No Stripe metadata updates were applied. Check warnings above for details.");
  } else {
    console.log(`Done. Applied ${updatesApplied} Stripe metadata update(s).`);
  }

  if (priceUpdatesAttempted > 0) {
    console.log(
      `Price metadata updates attempted: ${priceUpdatesAttempted}, applied: ${priceUpdatesApplied}, warnings: ${priceWarnings}`,
    );
  }
}

updateStripeProducts().catch((error) => {
  console.error("Failed to update Stripe product metadata.", error);
  process.exitCode = 1;
});
