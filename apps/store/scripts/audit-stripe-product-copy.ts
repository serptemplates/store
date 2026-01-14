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

import type { ProductData } from "../lib/products/product-schema";

const API_VERSION: Stripe.LatestApiVersion = "2024-04-10";
const REQUIRED_DISCLAIMER_SUFFIX =
  "All trademarks are property of their respective owners and use of them does not imply affiliation or endorsement.";

const REPO_ROOT = path.resolve(__dirname, "../../..");

type StripeMode = "live" | "test";
type StripeClient = { mode: StripeMode; stripe: Stripe };

type ProductStripeMapping = {
  slug: string;
  productName: string;
  stripeProductId: string;
  product: ProductData;
};

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

function loadEnvFiles() {
  const candidates = [
    path.join(REPO_ROOT, ".env"),
    path.join(process.cwd(), ".env"),
  ];

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

  const candidates = [
    process.env.STRIPE_SECRET_KEY_TEST,
    process.env.STRIPE_TEST_SECRET_KEY,
    process.env.STRIPE_SECRET_KEY,
  ];

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
      "No Stripe secret keys found. Set STRIPE_SECRET_KEY_LIVE / STRIPE_SECRET_KEY_TEST (or STRIPE_SECRET_KEY) before running this audit.",
    );
  }

  return clients;
}

async function collectTrademarkedStripeProducts(): Promise<ProductStripeMapping[]> {
  const { getAllProducts, resolveSeoProductName } = await loadProductLibs();
  return getAllProducts()
    .filter(
      (product) =>
        product.trademark_metadata?.uses_trademarked_brand
        && product.payment?.stripe?.metadata?.stripe_product_id?.trim(),
    )
    .map((product) => ({
      slug: product.slug,
      productName: resolveSeoProductName(product),
      stripeProductId: product.payment!.stripe!.metadata!.stripe_product_id!.trim(),
      product,
    }));
}

type AuditRow = {
  slug: string;
  stripeProductId: string;
  stripeName: string;
  stripeDescription: string;
  nameMatches: boolean;
  disclaimerPresent: boolean;
  disclaimerHasSuffix: boolean;
};

async function auditClientProducts(client: StripeClient, mappings: ProductStripeMapping[]): Promise<AuditRow[]> {
  const { formatTrademarkDisclaimer } = await loadProductLibs();
  const rows: AuditRow[] = [];

  for (const mapping of mappings) {
    try {
      const stripeProduct = await client.stripe.products.retrieve(mapping.stripeProductId);
      const description = stripeProduct.description ?? "";
      const expectedDisclaimer = formatTrademarkDisclaimer(mapping.product) ?? "";

      const nameMatches = stripeProduct.name?.startsWith(mapping.productName) ?? false;

      rows.push({
        slug: mapping.slug,
        stripeProductId: mapping.stripeProductId,
        stripeName: stripeProduct.name ?? "",
        stripeDescription: description,
        nameMatches,
        disclaimerPresent: expectedDisclaimer ? description.includes(expectedDisclaimer) : false,
        disclaimerHasSuffix: description.includes(REQUIRED_DISCLAIMER_SUFFIX),
      });
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError;
      console.warn(
        `⚠️  [${client.mode}] Failed to retrieve product ${mapping.stripeProductId} for slug ${mapping.slug}: ${stripeError?.message ?? "Unknown error"}`,
      );
    }
  }

  return rows;
}

async function main() {
  loadEnvFiles();
  const mappings = await collectTrademarkedStripeProducts();

  if (mappings.length === 0) {
    console.log("No trademarked products with stripe_product_id found in local data.");
    return;
  }

  const clients = createStripeClients();

  for (const client of clients) {
    console.log(`\n=== Auditing ${mappings.length} products against Stripe ${client.mode.toUpperCase()} ===`);
    const rows = await auditClientProducts(client, mappings);

    if (rows.length === 0) {
      console.log("No products retrieved.");
      continue;
    }

    console.table(
      rows.map((row) => ({
        slug: row.slug,
        stripeProductId: row.stripeProductId,
        stripeName: row.stripeName,
        nameMatches: row.nameMatches,
        disclaimerPresent: row.disclaimerPresent,
        disclaimerHasSuffix: row.disclaimerHasSuffix,
      })),
    );

    const failing = rows.filter((row) => !row.nameMatches || !row.disclaimerPresent || !row.disclaimerHasSuffix);
    if (failing.length > 0) {
      console.log(`⚠️  ${failing.length} product(s) need updates in Stripe ${client.mode}.`);
      for (const row of failing) {
        console.log(
          `   • ${row.slug} (${row.stripeProductId}) -> nameMatches=${row.nameMatches}, disclaimerPresent=${row.disclaimerPresent}, disclaimerHasSuffix=${row.disclaimerHasSuffix}`,
        );
      }
    } else {
      console.log(`✅ All products match the expected naming/disclaimer rules in Stripe ${client.mode}.`);
    }
  }
}

main().catch((error) => {
  console.error("Stripe copy audit failed.", error);
  process.exitCode = 1;
});
