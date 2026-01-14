#!/usr/bin/env tsx
/* eslint-disable no-console */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import Stripe from "stripe";
import dotenv from "dotenv";

import { normalizeStripeAccountAlias } from "@/config/payment-accounts";
import { getOptionalStripeSecretKey } from "@/lib/payments/stripe-environment";
import { getAllProducts } from "@/lib/products/product";

const API_VERSION: Stripe.LatestApiVersion = "2024-04-10";
const REPO_ROOT = path.resolve(__dirname, "../../.." /* monorepo root */);
const DEFAULT_OUTPUT = path.join(REPO_ROOT, "docs/operations/stripe-metadata-inventory.md");

type CliArgs = {
  accountAlias: string;
  outputPath: string;
};

function loadEnvFiles() {
  const candidates = [
    path.join(REPO_ROOT, ".env"),
    path.join(process.cwd(), ".env"),
  ];

  for (const candidate of candidates) {
    try {
      dotenv.config({ path: candidate });
    } catch {
      // ignore missing files
    }
  }
}

function parseCliArgs(argv: string[]): CliArgs {
  let accountAlias: string | undefined;
  let outputPath: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;

    const [rawKey, rawValue] = arg.includes("=") ? arg.split("=", 2) : [arg, undefined];
    const key = rawKey.slice(2);
    let value = rawValue;

    if (value === undefined) {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        value = next;
        i += 1;
      }
    }

    if (!value) continue;

    if (key === "account") {
      accountAlias = value;
    } else if (key === "out" || key === "output") {
      outputPath = path.resolve(process.cwd(), value);
    }
  }

  return {
    accountAlias: normalizeStripeAccountAlias(accountAlias),
    outputPath: outputPath ?? DEFAULT_OUTPUT,
  };
}

function formatMetadataTable(metadata: Record<string, string> | null | undefined): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "_No metadata on record._\n";
  }

  const rows = Object.entries(metadata)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `| \`${key}\` | ${value.replace(/\n/g, "<br />")} |`)
    .join("\n");

  return ["| Key | Value |", "| --- | --- |", rows, ""].join("\n");
}

type MetadataSnapshot = {
  slug: string;
  name: string;
  stripeProductId: string | null;
  stripePriceId: string | null;
  priceCurrency: string | null;
  priceAmount: number | null;
  productMetadata: Record<string, string> | null;
  priceMetadata: Record<string, string> | null;
  productActive: boolean | null;
  priceActive: boolean | null;
};

async function collectStripeMetadata(stripe: Stripe): Promise<MetadataSnapshot[]> {
  const products = getAllProducts();
  const snapshots: MetadataSnapshot[] = [];
  const productCache = new Map<string, Stripe.Product | null>();
  const priceCache = new Map<string, Stripe.Price | null>();

  for (const product of products) {
    const slug = product.slug;
    const name = product.name ?? slug;
    const stripeDetails = product.payment?.stripe;
    const stripeProductId =
      typeof stripeDetails?.metadata?.stripe_product_id === "string"
        ? stripeDetails.metadata.stripe_product_id.trim()
        : null;
    const stripePriceId = typeof stripeDetails?.price_id === "string" ? stripeDetails.price_id.trim() : null;

    let stripeProduct: Stripe.Product | null = null;
    if (stripeProductId) {
      if (productCache.has(stripeProductId)) {
        stripeProduct = productCache.get(stripeProductId) ?? null;
      } else {
        try {
          stripeProduct = await stripe.products.retrieve(stripeProductId);
        } catch (error) {
          console.warn(`⚠️  Failed to fetch Stripe product ${stripeProductId} for ${slug}:`, error);
          stripeProduct = null;
        }
        productCache.set(stripeProductId, stripeProduct);
      }
    }

    let stripePrice: Stripe.Price | null = null;
    if (stripePriceId) {
      if (priceCache.has(stripePriceId)) {
        stripePrice = priceCache.get(stripePriceId) ?? null;
      } else {
        try {
          stripePrice = await stripe.prices.retrieve(stripePriceId);
        } catch (error) {
          console.warn(`⚠️  Failed to fetch Stripe price ${stripePriceId} for ${slug}:`, error);
          stripePrice = null;
        }
        priceCache.set(stripePriceId, stripePrice);
      }
    }

    snapshots.push({
      slug,
      name,
      stripeProductId,
      stripePriceId,
      priceCurrency: typeof stripePrice?.currency === "string" ? stripePrice.currency.toUpperCase() : null,
      priceAmount: typeof stripePrice?.unit_amount === "number" ? stripePrice.unit_amount : null,
      productMetadata: stripeProduct?.metadata ?? null,
      priceMetadata: stripePrice?.metadata ?? null,
      productActive: typeof stripeProduct?.active === "boolean" ? stripeProduct.active : null,
      priceActive: typeof stripePrice?.active === "boolean" ? stripePrice.active : null,
    });
  }

  return snapshots.sort((a, b) => a.slug.localeCompare(b.slug));
}

function formatSnapshot(entry: MetadataSnapshot): string {
  const lines: string[] = [];
  lines.push(`## ${entry.slug}`);
  lines.push(`*Product:* ${entry.name}`);
  lines.push(`- Stripe Product ID: ${entry.stripeProductId ? `\`${entry.stripeProductId}\`` : "_none_"}${
    entry.productActive === false ? " (inactive)" : entry.productActive ? " (active)" : ""
  }`);
  const priceAmount =
    entry.priceAmount != null && entry.priceCurrency
      ? `${(entry.priceAmount / 100).toFixed(2)} ${entry.priceCurrency}`
      : null;
  lines.push(
    `- Stripe Price ID: ${entry.stripePriceId ? `\`${entry.stripePriceId}\`` : "_none_"}${
      entry.priceActive === false ? " (inactive)" : entry.priceActive ? " (active)" : ""
    }${priceAmount ? ` — ${priceAmount}` : ""}`,
  );
  lines.push("");
  lines.push("### Stripe Product Metadata");
  lines.push(formatMetadataTable(entry.productMetadata));
  lines.push("### Stripe Price Metadata");
  lines.push(formatMetadataTable(entry.priceMetadata));
  return lines.join("\n");
}

async function main() {
  loadEnvFiles();
  const { accountAlias, outputPath } = parseCliArgs(process.argv.slice(2));
  const secretKey = getOptionalStripeSecretKey({ mode: "live", accountAlias });
  if (!secretKey) {
    throw new Error(`Missing live Stripe secret key for alias "${accountAlias}".`);
  }

  console.log(`Using Stripe account alias: ${accountAlias} (live)`);
  const stripe = new Stripe(secretKey, { apiVersion: API_VERSION });
  const snapshots = await collectStripeMetadata(stripe);

  const header = [
    "# Stripe Metadata Inventory",
    "",
    `- Generated: ${new Date().toISOString()}`,
    `- Stripe account alias: ${accountAlias}`,
    `- Products scanned: ${snapshots.length}`,
    "",
  ].join("\n");

  const body = snapshots.map(formatSnapshot).join("\n\n");
  const output = `${header}${body}\n`;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, output, "utf8");

  console.log(`Metadata written to ${path.relative(process.cwd(), outputPath)}`);
}

main().catch((error) => {
  console.error("Failed to export Stripe metadata.", error);
  process.exitCode = 1;
});
