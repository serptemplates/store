#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Stripe from "stripe";
import dotenv from "dotenv";
import { parseDocument, YAMLMap } from "yaml";

const apiVersion = "2024-04-10";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const liveSecret = process.env.STRIPE_SECRET_KEY;
const testSecret = process.env.STRIPE_SECRET_KEY_TEST;

if (!liveSecret && !testSecret) {
  console.error("⚠️  STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST must be set.");
  process.exit(1);
}

const clients = [];
if (liveSecret) {
  clients.push({ mode: "live", stripe: new Stripe(liveSecret, { apiVersion }) });
}
if (testSecret) {
  clients.push({ mode: "test", stripe: new Stripe(testSecret, { apiVersion }) });
}
const zeroDecimalCurrencies = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

async function fetchPrice(priceId) {
  let lastError = null;

  for (const client of clients) {
    try {
      const price = await client.stripe.prices.retrieve(String(priceId));
      return { price, mode: client.mode };
    } catch (error) {
      lastError = error;
      if (error && error.code === "resource_missing") {
        continue;
      }
      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Unable to retrieve price ${priceId}`);
}

function formatAmount(unitAmount, currency) {
  if (typeof unitAmount !== "number") {
    throw new Error("unit_amount is missing for price");
  }
  const upperCurrency = currency?.toUpperCase?.();
  if (!upperCurrency) {
    throw new Error("currency is missing for price");
  }

  const divisor = zeroDecimalCurrencies.has(upperCurrency) ? 1 : 100;
  const amount = unitAmount / divisor;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: upperCurrency,
  }).format(amount);
}

async function main() {
    const productsDir = path.resolve(process.cwd(), "apps/store/data/products");

  if (!fs.existsSync(productsDir)) {
    console.error(`⚠️  Products directory not found at ${productsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(productsDir).filter((file) => /\.ya?ml$/i.test(file));
  if (!files.length) {
    console.log("ℹ️  No product YAML files found. Nothing to sync.");
    return;
  }

  let updatedFiles = 0;

  for (const file of files) {
    const absolutePath = path.join(productsDir, file);
    const raw = fs.readFileSync(absolutePath, "utf8");
    const doc = parseDocument(raw);

    const stripeNode = doc.get("stripe", true);
    if (!stripeNode || typeof stripeNode.get !== "function") {
      console.log(`ℹ️  ${file}: no stripe block, skipping.`);
      continue;
    }

    const priceId = stripeNode.get("price_id");
    if (!priceId || typeof priceId !== "string" || priceId.toUpperCase() === "PLACEHOLDER" || !priceId.startsWith("price_")) {
      console.log(`ℹ️  ${file}: stripe.price_id not set to a real Stripe price, skipping.`);
      continue;
    }

    try {
      const { price } = await fetchPrice(priceId);
      const formatted = formatAmount(price.unit_amount, price.currency);

      let pricingNode = doc.get("pricing", true);
      if (!pricingNode || typeof pricingNode.get !== "function") {
        pricingNode = new YAMLMap();
        doc.set("pricing", pricingNode);
      }

      const existing = pricingNode.get("price");

      if (existing === formatted) {
        console.log(`✅  ${file}: price already up to date (${formatted}).`);
        continue;
      }

      pricingNode.set("price", formatted);
      fs.writeFileSync(absolutePath, doc.toString({ lineWidth: 0 }));
      updatedFiles += 1;
      console.log(`📝  ${file}: price updated to ${formatted}.`);
    } catch (error) {
      console.error(`❌  ${file}: failed to update price.`, error);
      process.exitCode = 1;
    }
  }

  if (updatedFiles === 0) {
    console.log("✨ Stripe price sync complete – no changes detected.");
  } else {
    console.log(`✨ Stripe price sync complete – updated ${updatedFiles} file(s).`);
  }
}

await main();
