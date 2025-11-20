#!/usr/bin/env node
// Quick Stripe price audit: checks manifest price IDs against the account tied to STRIPE_SECRET_KEY.
import fs from "fs";
import path from "path";
import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  console.error("Missing STRIPE_SECRET_KEY. Set it to the live key to audit live prices.");
  process.exit(1);
}

const stripe = new Stripe(secret);
const manifestPath = path.resolve("apps/store/data/prices/manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const ids = new Set();
for (const entry of Object.values(manifest)) {
  const stripeCfg = entry.stripe || {};
  if (stripeCfg.live_price_id) ids.add(stripeCfg.live_price_id.trim());
  if (stripeCfg.test_price_id) ids.add(stripeCfg.test_price_id.trim());
}

(async () => {
  for (const id of ids) {
    try {
      const price = await stripe.prices.retrieve(id, { expand: ["product"] });
      const product = price.product;
      const active = product && typeof product === "object" ? product.active : false;
      if (!active) {
        console.log(`⚠️ ${id}: product inactive or missing (product ${product?.id ?? "unknown"})`);
      } else {
        console.log(`✅ ${id}: ok (product ${product.id})`);
      }
    } catch (err) {
      console.log(`❌ ${id}: ${err.message}`);
    }
  }
})().catch((err) => {
  // Avoid broken pipe when piping to head/less
  if (err.code === "EPIPE") process.exit(0);
  throw err;
});
