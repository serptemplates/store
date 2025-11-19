#!/usr/bin/env tsx
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import Stripe from "stripe";
import dotenv from "dotenv";
import { normalizeStripeAccountAlias } from "../config/payment-accounts";
import { getOptionalStripeSecretKey, type StripeMode } from "../lib/payments/stripe-environment";
import { getAllProducts } from "../lib/products/product";

const API_VERSION = "2025-06-30.basil; checkout_cross_sells_beta=v1" as unknown as Stripe.LatestApiVersion;
const REPO_ROOT = path.resolve(__dirname, "../../..");

type CliArgs = {
  accountAlias: string;
};

type CrossSellConfig = {
  downloaderProductId?: string;
};

const DEFAULT_LIVE_DOWNLOADER_CROSS_SELL_PRODUCT_ID = "prod_TPQDdWiCCy0HK2";

const CROSS_SELL_ENV_BASES = [
  "STRIPE_CROSS_SELL_DOWNLOADERS_PRODUCT_ID",
  "STRIPE_CROSS_SELL_ALL_BUNDLE_PRODUCT_ID",
  "STRIPE_CROSS_SELL_ADULT_BUNDLE_PRODUCT_ID",
];

function buildEnvCandidates(base: string, aliasToken: string, mode: StripeMode): string[] {
  const suffix = mode === "live" ? "LIVE" : "TEST";
  return [
    `${base}__${aliasToken}__${suffix}`,
    `${base}__${aliasToken}`,
    `${base}_${suffix}`,
    base,
  ];
}

function resolveCrossSellConfig(mode: StripeMode, accountAlias: string): CrossSellConfig {
  const aliasToken = accountAlias.replace(/[^a-z0-9]/gi, "_").toUpperCase();

  for (const base of CROSS_SELL_ENV_BASES) {
    const candidates = buildEnvCandidates(base, aliasToken, mode);
    for (const candidate of candidates) {
      const value = process.env[candidate];
      if (typeof value === "string" && value.trim().length > 0) {
        return { downloaderProductId: value.trim() };
      }
    }
  }

  if (mode === "live") {
    return { downloaderProductId: DEFAULT_LIVE_DOWNLOADER_CROSS_SELL_PRODUCT_ID };
  }

  return { downloaderProductId: undefined };
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
  const { accountAlias } = parseCliArgs(process.argv.slice(2));
  const products = getAllProducts();
  if (products.length === 0) {
    console.log("No product records found. Nothing to update.");
    return;
  }

  console.log(`Using Stripe account alias: ${accountAlias}`);
  const clients = createStripeClients(accountAlias);
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

    for (const client of clients) {
      const cfg = resolveCrossSellConfig(client.mode, accountAlias);
      const target = cfg.downloaderProductId;
      if (!target) {
        console.log(`⚪️  [${client.mode}] ${slug}: skipping (no cross-sell target configured).`);
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
