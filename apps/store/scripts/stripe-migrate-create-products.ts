#!/usr/bin/env tsx
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import Stripe from "stripe";
import dotenv from "dotenv";
import { register as registerTsconfigPaths } from "tsconfig-paths";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const TS_CONFIG_PATH = path.resolve(__dirname, "../tsconfig.json");
if (fs.existsSync(TS_CONFIG_PATH)) {
  const tsconfig = JSON.parse(fs.readFileSync(TS_CONFIG_PATH, "utf8"));
  const baseUrl = path.resolve(path.dirname(TS_CONFIG_PATH), tsconfig.compilerOptions?.baseUrl ?? ".");
  const paths = tsconfig.compilerOptions?.paths ?? {};
  registerTsconfigPaths({ baseUrl, paths });
}

dotenv.config({ path: path.join(REPO_ROOT, ".env") });

const API_VERSION: Stripe.StripeConfig["apiVersion"] = "2024-04-10";

type StripeMode = "live" | "test";

type TargetProduct = {
  slug: string;
  name: string;
  description?: string | null;
  unitAmount: number;
  currency: string;
  ghlTag?: string | null;
};

type StripeIds = {
  productId: string;
  priceId: string;
};

type MigrationResult = {
  slug: string;
  mode: StripeMode;
  productId: string;
  priceId: string;
  created: boolean;
};

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing ${label}`);
  }
  return value.trim();
}

function createStripeClient(mode: StripeMode): Stripe {
  if (mode === "live") {
    const liveSecret = process.env.STRIPE_SECRET_KEY_LIVE ?? process.env.STRIPE_SECRET_KEY;
    const secret = assertString(liveSecret, "STRIPE_SECRET_KEY (live)");
    if (!secret.startsWith("sk_live_")) {
      throw new Error("STRIPE_SECRET_KEY must be an sk_live_* value for live mode");
    }
    return new Stripe(secret, { apiVersion: API_VERSION });
  }

  const candidates = [
    process.env.STRIPE_SECRET_KEY_TEST,
    process.env.STRIPE_TEST_SECRET_KEY,
    process.env.STRIPE_SECRET_KEY,
  ];
  const secret = candidates.find((value) => typeof value === "string" && value.startsWith("sk_test_"));
  if (!secret) {
    throw new Error("Missing STRIPE_SECRET_KEY_TEST for test mode");
  }
  return new Stripe(secret, { apiVersion: API_VERSION });
}

function loadManifest(): Record<string, { unit_amount: number; currency: string }> {
  const manifestPath = path.join(REPO_ROOT, "apps/store/data/prices/manifest.json");
  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw) as Record<
    string,
    { unit_amount: number; currency: string }
  >;
  return manifest;
}

async function loadLiveProducts(): Promise<TargetProduct[]> {
  const { getAllProducts } = await import("@/lib/products/product");
  const manifest = loadManifest();
  return getAllProducts()
    .filter((product) => product.status === "live")
    .map((product) => {
      const manifestEntry = manifest[product.slug];
      if (!manifestEntry) {
        throw new Error(`Missing manifest entry for ${product.slug}`);
      }
      const ghlTag =
        Array.isArray(product.ghl?.tag_ids) && typeof product.ghl.tag_ids[0] === "string"
          ? product.ghl.tag_ids[0]
          : null;
      return {
        slug: product.slug,
        name: product.name ?? product.slug,
        description: product.tagline ?? product.description ?? null,
        unitAmount: Number(manifestEntry.unit_amount),
        currency: (manifestEntry.currency ?? "usd").toLowerCase(),
        ghlTag,
      };
    });
}

function loadBundleTargets(): TargetProduct[] {
  return [
    {
      slug: "serp-downloaders-bundle",
      name: "All SERP Video Downloaders",
      description: "Bundle offer applied via checkout cross-sell.",
      unitAmount: 9700,
      currency: "usd",
      ghlTag: "purchase-serp-downloaders-bundle",
    },
    {
      slug: "serp-downloaders-adult-bundle",
      name: "SERP Downloaders Adult Bundle",
      description: "Adult bundle cross-sell.",
      unitAmount: 2700,
      currency: "usd",
      ghlTag: "purchase-serp-downloaders-adult-bundle",
    },
  ];
}

async function findExistingProduct(stripe: Stripe, slug: string): Promise<Stripe.Product | null> {
  const query = `metadata['product_slug']:'${slug}'`;
  try {
    const search = await stripe.products.search({ query, limit: 1 });
    return search.data[0] ?? null;
  } catch (error) {
    console.warn(`⚠️  Failed to search for ${slug}. ${String((error as Error).message ?? error)}`);
    return null;
  }
}

function normalizeMetadata(target: TargetProduct): Record<string, string> {
  const metadata: Record<string, string> = {
    product_slug: target.slug,
  };
  if (target.ghlTag) {
    metadata.ghl_tag = target.ghlTag;
  }
  return metadata;
}

async function ensurePrice(
  stripe: Stripe,
  productId: string,
  target: TargetProduct,
  existingPriceId?: string | Stripe.Price | null,
): Promise<string> {
  if (existingPriceId) {
    const price =
      typeof existingPriceId === "string"
        ? await stripe.prices.retrieve(existingPriceId)
        : existingPriceId;
    const amountMatches = price.unit_amount === target.unitAmount;
    const currencyMatches =
      (price.currency ?? "").toLowerCase() === (target.currency ?? "").toLowerCase();
    if (amountMatches && currencyMatches) {
      return price.id;
    }
  }

  const metadata = normalizeMetadata(target);
  const created = await stripe.prices.create({
    product: productId,
    unit_amount: target.unitAmount,
    currency: target.currency,
    metadata,
    nickname: target.slug,
  });
  console.log(`   ↳ 💰 Created price ${created.id} (${target.currency} ${target.unitAmount})`);
  return created.id;
}

async function ensureProduct(
  stripe: Stripe,
  mode: StripeMode,
  target: TargetProduct,
): Promise<{ ids: StripeIds; created: boolean }> {
  const metadata = normalizeMetadata(target);
  const existing = await findExistingProduct(stripe, target.slug);
  if (existing) {
    const productId = existing.id;
    await stripe.products.update(productId, {
      metadata,
      name: target.name,
      description: target.description ?? undefined,
    });
    const priceId = await ensurePrice(stripe, productId, target, existing.default_price ?? null);
    if (typeof existing.default_price !== "string" || existing.default_price !== priceId) {
      await stripe.products.update(productId, { default_price: priceId });
    }
    return { ids: { productId, priceId }, created: false };
  }

  const created = await stripe.products.create({
    name: target.name,
    description: target.description ?? undefined,
    metadata,
    default_price_data: {
      unit_amount: target.unitAmount,
      currency: target.currency,
    },
  });
  const defaultPriceId =
    typeof created.default_price === "string"
      ? created.default_price
      : created.default_price?.id;
  if (!defaultPriceId) {
    throw new Error(`Failed to create default price for ${target.slug} (${mode})`);
  }
  await stripe.prices.update(defaultPriceId, { metadata });
  console.log(`✅ [${mode}] Created product ${created.id} (${target.slug})`);
  return { ids: { productId: created.id, priceId: defaultPriceId }, created: true };
}

async function main() {
  const products = await loadLiveProducts();
  const bundles = loadBundleTargets();
  const targets: TargetProduct[] = [...products, ...bundles];
  const liveStripe = createStripeClient("live");
  const testStripe = createStripeClient("test");

  const results: MigrationResult[] = [];

  for (const target of targets) {
    console.log(`\n=== ${target.slug} ===`);
    const live = await ensureProduct(liveStripe, "live", target);
    results.push({
      slug: target.slug,
      mode: "live",
      productId: live.ids.productId,
      priceId: live.ids.priceId,
      created: live.created,
    });

    const test = await ensureProduct(testStripe, "test", target);
    results.push({
      slug: target.slug,
      mode: "test",
      productId: test.ids.productId,
      priceId: test.ids.priceId,
      created: test.created,
    });
  }

  const outputPath = path.join(REPO_ROOT, "tmp", `stripe-migration-results-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  console.log(`\nWrote results to ${outputPath}`);
}

main().catch((error) => {
  console.error("Stripe migration script failed.");
  console.error(error);
  process.exit(1);
});
