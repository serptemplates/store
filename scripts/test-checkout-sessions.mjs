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

  if (!stripeConfig.success_url || !stripeConfig.cancel_url) {
    console.warn(`⚠️  ${slug}: missing success_url or cancel_url, skipping.`);
    return;
  }

  const metadata = {
    offerId: slug,
    productSlug: slug,
    ...(typeof stripeConfig.metadata === "object" ? stripeConfig.metadata : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: stripeConfig.mode ?? "payment",
      success_url: stripeConfig.success_url,
      cancel_url: stripeConfig.cancel_url,
      line_items: [
        {
          price: stripeConfig.price_id,
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
