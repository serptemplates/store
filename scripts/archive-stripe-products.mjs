#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import fs from "node:fs";
import dotenv from "dotenv";
import Stripe from "stripe";

const cwd = process.cwd();
dotenv.config({ path: path.join(cwd, ".env") });

const ARCHIVE_TARGETS = [
  { slug: "template-product-pdf-1", priceId: "price_1S99gC06JrOmKRCmPC3F7USQ", productId: "prod_SfvWdzNxPOqn3W" },
  { slug: "test-1", priceId: "price_1S99gD06JrOmKRCmL9re7OzI", productId: "prod_Sv5wlknErvxAI7" },
  { slug: "test-product", priceId: "price_1S99gD06JrOmKRCmLi34fD6H", productId: "prod_Sv67AWogwAQhG5" },
  { slug: "devianart-downloader", priceId: "price_1S99wp06JrOmKRCmePU55FBS", productId: "prod_Sv6GJqvkznC37N" },
  { slug: "dream-customers-archive", priceId: "price_1S99fl06JrOmKRCmCJo0Lb5E", productId: "prod_Sf1PRP1pQz0Q2c" },
  { slug: "flicker-downloader", priceId: "price_1S99ws06JrOmKRCm4plasFrx", productId: "prod_Sv6GGmE1k2HTUv" },
  { slug: "redgif-downloader", priceId: "price_1S99g306JrOmKRCmkUnbu4WW", productId: "prod_Sv6HL7IYcxLyrP" },
  { slug: "tnaflix-downloader", priceId: "price_1S9DWo06JrOmKRCm6962bc39", productId: "prod_T5OJhXHuVxiNzY" },
  { slug: "xnxx-downloader", priceId: "price_1S9DXT06JrOmKRCm72SWURlH", productId: "prod_SrGYKrazcfgi5G" },
  { slug: "beeg-downloader", priceId: "price_1S9DVj06JrOmKRCmeQ336EV6", productId: "prod_SrFXkM8CAB2Ds8" },
  { slug: "serpuniversity-pro" },
  { slug: "learn-command-line" },
  { slug: "ai-voice-cloner" },
];

function resolveStripeKey() {
  const archiveEnv = (process.env.STRIPE_ARCHIVE_ENV || "").toLowerCase();
  const liveKey = process.env.STRIPE_SECRET_KEY;
  const testKey = process.env.STRIPE_SECRET_KEY_TEST;

  if (archiveEnv === "test" && testKey) return { key: testKey, mode: "test" };
  if (archiveEnv === "live" && liveKey) return { key: liveKey, mode: "live" };
  if (liveKey) return { key: liveKey, mode: "live" };
  if (testKey) return { key: testKey, mode: "test" };

  return null;
}

const resolved = resolveStripeKey();
if (!resolved) {
  console.error("❌ STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST must be set.");
  process.exit(1);
}

const stripe = new Stripe(resolved.key, { apiVersion: "2024-04-10" });

async function archivePrice(priceId, slug) {
  if (!priceId) return null;
  try {
    const price = await stripe.prices.update(priceId, { active: false });
    console.log(`   • Price ${price.id} (slug: ${slug}) set to inactive`);
    return price;
  } catch (error) {
    if (error?.code === "resource_missing") {
      console.warn(`   • Price ${priceId} not found (slug: ${slug})`);
      return null;
    }
    throw error;
  }
}

async function archiveProduct(productId, slug) {
  if (!productId) return null;
  try {
    const product = await stripe.products.update(productId, { active: false });
    console.log(`   • Product ${product.id} (slug: ${slug}) set to inactive`);
    return product;
  } catch (error) {
    if (error?.code === "resource_missing") {
      console.warn(`   • Product ${productId} not found (slug: ${slug})`);
      return null;
    }
    throw error;
  }
}

async function run() {
  console.log(`Archiving ${ARCHIVE_TARGETS.length} products in Stripe (${resolved.mode} mode).`);
  for (const target of ARCHIVE_TARGETS) {
    console.log(`\nProcessing ${target.slug}...`);
    try {
      await archivePrice(target.priceId, target.slug);
      await archiveProduct(target.productId, target.slug);
    } catch (error) {
      console.error(` ❌ Failed to archive ${target.slug}:`, error?.message || error);
    }
  }

  console.log("\nDone.");
}

run();
