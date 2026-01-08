#!/usr/bin/env tsx
/* eslint-disable no-console */

import path from "node:path";
import process from "node:process";

import Stripe from "stripe";
import dotenv from "dotenv";
import fs from "node:fs";
import { normalizeStripeAccountAlias } from "../config/payment-accounts";
import { getOptionalStripeSecretKey, type StripeMode } from "../lib/payments/stripe-environment";
import { getAllProductsIncludingExcluded } from "../lib/products/product";

const API_VERSION: Stripe.LatestApiVersion = "2024-04-10";
const REPO_ROOT = path.resolve(__dirname, "../../..");

type CliArgs = {
  accountAlias: string;
};

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

type StripeClient = { mode: StripeMode; stripe: Stripe };
function parseCliArgs(argv: string[]): CliArgs {
  let alias: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const [rawKey, rawValue] = arg.includes("=") ? arg.split("=", 2) : [arg, undefined];
    const key = rawKey.slice(2);
    const value = rawValue ?? argv[i + 1];

    if (rawValue === undefined && (i + 1 >= argv.length || argv[i + 1].startsWith("--"))) {
      continue;
    }

    if (key === "account") {
      alias = value;
      if (rawValue === undefined) i += 1;
    }
  }

  return { accountAlias: normalizeStripeAccountAlias(alias) };
}

function createStripeClients(accountAlias: string): StripeClient[] {
  const clients: StripeClient[] = [];
  const modes: StripeMode[] = ["live", "test"];

  for (const mode of modes) {
    const secret = getOptionalStripeSecretKey({ mode, accountAlias });
    if (!secret) {
      continue;
    }
    clients.push({ mode, stripe: new Stripe(secret, { apiVersion: API_VERSION }) });
  }

  if (clients.length === 0) {
    throw new Error(`No Stripe secret keys found for account alias "${accountAlias}". Check your env configuration.`);
  }

  return clients;
}

async function updateStripeProducts() {
  const { accountAlias } = parseCliArgs(process.argv.slice(2));
  const products = getAllProductsIncludingExcluded();
  if (products.length === 0) {
    console.log("No product records found. Nothing to update.");
    return;
  }

  console.log(`Using Stripe account alias: ${accountAlias}`);
  const clients = createStripeClients(accountAlias);
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
