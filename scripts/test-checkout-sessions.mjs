#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import Stripe from "stripe";
import dotenv from "dotenv";
import { parse } from "yaml";

const apiVersion = "2024-04-10";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const secret = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;

if (!secret) {
  console.error("❌ STRIPE_SECRET_KEY_TEST or STRIPE_SECRET_KEY is required.");
  process.exit(1);
}

const stripe = new Stripe(secret, { apiVersion });
const liveSecret = process.env.STRIPE_SECRET_KEY;
const liveClient = liveSecret ? new Stripe(liveSecret, { apiVersion }) : null;
const usingTestKey = secret.startsWith("sk_test");

const paymentMethodTypes = (process.env.STRIPE_CHECKOUT_PAYMENT_METHODS || "card")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const productsDir = path.resolve(process.cwd(), "apps/store/data/products");
if (!fs.existsSync(productsDir)) {
  console.error(`❌ Products directory not found at ${productsDir}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const slugFilters = new Set();

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--slug" && args[i + 1]) {
    slugFilters.add(args[i + 1]);
    i += 1;
  } else if (arg.startsWith("--slug=")) {
    slugFilters.add(arg.split("=")[1]);
  }
}

const files = fs
  .readdirSync(productsDir)
  .filter((file) => /\.ya?ml$/i.test(file))
  .sort();

let tested = 0;
let failures = 0;

async function ensureTestPriceId(slug, priceId) {
  if (!usingTestKey) {
    return priceId;
  }

  try {
    await stripe.prices.retrieve(priceId);
    return priceId;
  } catch (error) {
    const stripeError = error;
    if (!liveClient) {
      throw new Error(
        `Test price ${priceId} missing for ${slug}, and STRIPE_SECRET_KEY (live) is not configured to clone it.`,
      );
    }

    if (stripeError?.code && stripeError.code !== "resource_missing") {
      throw error;
    }
  }

  const livePrice = await liveClient.prices.retrieve(priceId, { expand: ["product"] });
  const lookupKey = livePrice.lookup_key ?? `slug:${slug}`;

  if (lookupKey) {
    const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1, active: true });
    if (existing.data[0]) {
      return existing.data[0].id;
    }
  }

  const amount = (typeof livePrice.unit_amount === "number")
    ? livePrice.unit_amount
    : Number.parseInt(livePrice.unit_amount_decimal ?? "", 10);

  if (!Number.isFinite(amount)) {
    throw new Error(`Unable to determine amount for price ${priceId}`);
  }

  const currency = livePrice.currency ?? "usd";
  const liveProduct = typeof livePrice.product === "string"
    ? await liveClient.products.retrieve(livePrice.product)
    : livePrice.product;

  const createProductPayload = {
    name: liveProduct?.name ?? slug,
    metadata: {
      slug,
      cloned_from_product: liveProduct?.id ?? null,
    },
  };

  const description = liveProduct?.description ?? undefined;
  if (description) {
    createProductPayload.description = description;
  }

  const images = Array.from(
    new Set((liveProduct?.images ?? []).filter((value) => typeof value === "string" && value.length > 0)),
  );
  if (images.length > 0) {
    createProductPayload.images = images.slice(0, 8);
  }

  const testProduct = await stripe.products.create(createProductPayload);

  const priceParams = {
    product: testProduct.id,
    currency,
    unit_amount: amount,
    nickname: livePrice.nickname ?? slug,
    metadata: {
      slug,
      cloned_from_price: livePrice.id,
    },
  };

  if (lookupKey) {
    priceParams.lookup_key = lookupKey;
    priceParams.transfer_lookup_key = true;
  }

  if (livePrice.recurring) {
    priceParams.recurring = {
      interval: livePrice.recurring.interval,
      interval_count: livePrice.recurring.interval_count ?? undefined,
      usage_type: livePrice.recurring.usage_type ?? undefined,
      aggregate_usage: livePrice.recurring.aggregate_usage ?? undefined,
      trial_period_days: livePrice.recurring.trial_period_days ?? undefined,
    };
  }

  if (livePrice.tax_behavior) {
    priceParams.tax_behavior = livePrice.tax_behavior;
  }

  if (livePrice.billing_scheme) {
    priceParams.billing_scheme = livePrice.billing_scheme;
  }

  const createdPrice = await stripe.prices.create(priceParams);
  console.log(`🆕  Created test price ${createdPrice.id} for ${slug}`);
  return createdPrice.id;
}

async function testProduct(file) {
  const absolutePath = path.join(productsDir, file);
  const raw = fs.readFileSync(absolutePath, "utf8");
  const data = parse(raw);
  const slug = data?.slug || file.replace(/\.ya?ml$/i, "");

  if (slugFilters.size > 0 && !slugFilters.has(slug)) {
    return;
  }

  const stripeConfig = data?.stripe;
  if (!stripeConfig || typeof stripeConfig.price_id !== "string") {
    console.log(`ℹ️  ${slug}: no stripe.price_id defined, skipping.`);
    return;
  }

  if (!data.success_url || !data.cancel_url) {
    console.warn(`⚠️  ${slug}: missing success_url or cancel_url, skipping.`);
    return;
  }

  const metadata = {
    offerId: slug,
    productSlug: slug,
    productPageUrl: data.product_page_url,
    store_serp_co_product_page_url: data.store_serp_co_product_page_url,
    apps_serp_co_product_page_url: data.apps_serp_co_product_page_url,
    purchaseUrl: data.serply_link,
    serply_link: data.serply_link,
    success_url: data.success_url,
    cancel_url: data.cancel_url,
    ...(typeof stripeConfig.metadata === "object" ? stripeConfig.metadata : {}),
  };

  try {
    const priceId = await ensureTestPriceId(slug, stripeConfig.price_id);

    const session = await stripe.checkout.sessions.create({
      mode: stripeConfig.mode ?? "payment",
      success_url: data.success_url,
      cancel_url: data.cancel_url,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata,
      payment_method_types: paymentMethodTypes,
      allow_promotion_codes: Boolean(stripeConfig.allow_promotion_codes),
    });

    tested += 1;
    console.log(`✅  ${slug}: session ${session.id} created (${session.currency?.toUpperCase?.() ?? "n/a"} ${session.amount_total ?? 0})`);
  } catch (error) {
    failures += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌  ${slug}: failed to create checkout session -> ${message}`);
  }
}

async function main() {
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop -- sequential to avoid Stripe rate limits
    await testProduct(file);
  }

  console.log("\nSummary:");
  console.log(`  Tested products: ${tested}`);
  console.log(`  Failures: ${failures}`);

  if (failures > 0) {
    process.exitCode = 1;
  }
}

await main();
