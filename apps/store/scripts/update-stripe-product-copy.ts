#!/usr/bin/env tsx
/* eslint-disable no-console */

import path from "node:path";
import process from "node:process";
import fs from "node:fs";

import Stripe from "stripe";
import dotenv from "dotenv";
import { register as registerTsconfigPaths } from "tsconfig-paths";

const TS_CONFIG_PATH = path.resolve(__dirname, "../tsconfig.json");
if (fs.existsSync(TS_CONFIG_PATH)) {
  const tsconfig = JSON.parse(fs.readFileSync(TS_CONFIG_PATH, "utf8"));
  const baseUrl = path.resolve(path.dirname(TS_CONFIG_PATH), tsconfig.compilerOptions?.baseUrl ?? ".");
  const paths = tsconfig.compilerOptions?.paths ?? {};
  registerTsconfigPaths({ baseUrl, paths });
}

const API_VERSION: Stripe.LatestApiVersion = "2024-04-10";
const REPO_ROOT = path.resolve(__dirname, "../../..");
const DISCLAIMER_SUFFIX =
  "All trademarks are property of their respective owners and use of them does not imply affiliation or endorsement.";

type ProductLibs = {
  getAllProducts: typeof import("../lib/products/product").getAllProducts;
  resolveSeoProductName: typeof import("../lib/products/unofficial-branding").resolveSeoProductName;
  formatTrademarkDisclaimer: typeof import("../lib/products/trademark").formatTrademarkDisclaimer;
};

let productLibsPromise: Promise<ProductLibs> | null = null;

async function loadProductLibs(): Promise<ProductLibs> {
  if (!productLibsPromise) {
    productLibsPromise = (async () => {
      const [productModule, brandingModule, trademarkModule] = await Promise.all([
        import("../lib/products/product"),
        import("../lib/products/unofficial-branding"),
        import("../lib/products/trademark"),
      ]);

      return {
        getAllProducts: productModule.getAllProducts,
        resolveSeoProductName: brandingModule.resolveSeoProductName,
        formatTrademarkDisclaimer: trademarkModule.formatTrademarkDisclaimer,
      };
    })();
  }

  return productLibsPromise;
}

type ProductStripeMapping = {
  slug: string;
  stripeProductId: string;
  resolvedName: string;
  disclaimer: string;
};

type StripeMode = "live" | "test";
type StripeClient = { mode: StripeMode; stripe: Stripe };

function loadEnvFiles() {
  const candidates = [path.join(REPO_ROOT, ".env"), path.join(process.cwd(), ".env")];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (!seen.has(candidate) && fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      seen.add(candidate);
    }
  }
}

function resolveStripeSecret(mode: StripeMode): string | undefined {
  if (mode === "live") {
    if (process.env.STRIPE_SECRET_KEY_LIVE?.startsWith("sk_live_")) {
      return process.env.STRIPE_SECRET_KEY_LIVE;
    }
    if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")) {
      return process.env.STRIPE_SECRET_KEY;
    }
    return undefined;
  }

  const candidates = [process.env.STRIPE_SECRET_KEY_TEST, process.env.STRIPE_TEST_SECRET_KEY, process.env.STRIPE_SECRET_KEY];
  for (const candidate of candidates) {
    if (candidate?.startsWith("sk_test_")) {
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
      "No Stripe secret keys found. Set STRIPE_SECRET_KEY_LIVE / STRIPE_SECRET_KEY_TEST (or STRIPE_SECRET_KEY) before running this script.",
    );
  }
  return clients;
}

function fallbackDisclaimer(productName: string, tradeName: string, legalEntity?: string | null): string {
  const trimmedLegal = legalEntity?.trim();
  const legalSegment = trimmedLegal ? `, ${trimmedLegal}` : "";
  return `${productName} is an independent product not affiliated with or endorsed by ${tradeName}${legalSegment} or any subsidiaries or affiliates. ${DISCLAIMER_SUFFIX}`;
}

async function collectMappings(): Promise<ProductStripeMapping[]> {
  const { getAllProducts, resolveSeoProductName, formatTrademarkDisclaimer } = await loadProductLibs();

  return getAllProducts()
    .filter(
      (product) =>
        product.trademark_metadata?.uses_trademarked_brand && typeof product.stripe?.metadata?.stripe_product_id === "string",
    )
    .map((product) => {
      const stripeProductId = product.stripe!.metadata!.stripe_product_id!.trim();
      const resolvedName = resolveSeoProductName(product);
      const computedDisclaimer = formatTrademarkDisclaimer(product);
      const fallback = fallbackDisclaimer(
        product.name?.trim() ?? resolvedName,
        product.trademark_metadata?.trade_name ?? product.name ?? resolvedName,
        product.trademark_metadata?.legal_entity,
      );
      const disclaimer = computedDisclaimer ? `${computedDisclaimer}` : fallback;

      return {
        slug: product.slug,
        stripeProductId,
        resolvedName,
        disclaimer,
      };
    });
}

async function updateProducts(client: StripeClient, mappings: ProductStripeMapping[]) {
  let applied = 0;
  for (const mapping of mappings) {
    try {
      await client.stripe.products.update(mapping.stripeProductId, {
        name: mapping.resolvedName,
        description: mapping.disclaimer,
      });
      applied += 1;
      console.log(`✅ [${client.mode}] ${mapping.slug} -> name & disclaimer updated`);
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError;
      console.warn(
        `⚠️  [${client.mode}] Failed to update ${mapping.slug} (${mapping.stripeProductId}): ${stripeError?.message ?? "unknown error"}`,
      );
    }
  }
  console.log(`Finished ${client.mode}: applied ${applied}/${mappings.length} product updates.`);
}

async function main() {
  loadEnvFiles();
  const mappings = await collectMappings();
  if (mappings.length === 0) {
    console.log("No trademarked Stripe products found in local data.");
    return;
  }

  const clients = createStripeClients();
  for (const client of clients) {
    console.log(`\n=== Updating ${mappings.length} products in Stripe ${client.mode.toUpperCase()} ===`);
    await updateProducts(client, mappings);
  }
}

main().catch((error) => {
  console.error("Stripe product copy update failed.", error);
  process.exitCode = 1;
});
