#!/usr/bin/env tsx
/* eslint-disable no-console */

import fs from "node:fs/promises";
import path from "node:path";

import stripJsonComments from "strip-json-comments";

import { getProductsDirectory } from "../lib/products/product";
import type { ProductData } from "../lib/products/product-schema";
import { convertProducts } from "./convert-products";

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

async function migrate() {
  const productsDir = getProductsDirectory();
  const entries = await fs.readdir(productsDir, { withFileTypes: true });
  const changedSlugs: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const slug = entry.name.replace(/\.json$/i, "");
    const filePath = path.join(productsDir, entry.name);

    const raw = await fs.readFile(filePath, "utf8");
    let data: Mutable<ProductData>;
    try {
      data = JSON.parse(stripJsonComments(raw)) as Mutable<ProductData>;
    } catch {
      console.warn(`Skipping invalid JSON: ${filePath}`);
      continue;
    }

    if (data.status !== "live") continue;

    let changed = false;

    // 1) Point CTA to internal checkout
    const desiredCta = `https://apps.serp.co/checkout/${slug}`;
    if (!data.pricing) {
      (data as any).pricing = {};
    }
    if ((data.pricing as any).cta_href !== desiredCta) {
      (data.pricing as any).cta_href = desiredCta;
      changed = true;
    }

    // Remove deprecated buy_button_destination if present
    if ((data as any).buy_button_destination !== undefined) {
      delete (data as any).buy_button_destination;
      changed = true;
    }

    // 2) Normalize success_url to success page (server will inject placeholder for Stripe)
    const desiredSuccess = "https://apps.serp.co/checkout/success";
    if (data.success_url !== desiredSuccess) {
      data.success_url = desiredSuccess;
      changed = true;
    }

    // 3) Ensure license.entitlements present (default to slug)
    const current = (data as any).license?.entitlements;
    if (!current) {
      (data as any).license = { ...(data as any).license, entitlements: [slug] };
      changed = true;
    } else if (typeof current === "string" && current.trim().length > 0) {
      (data as any).license = { ...(data as any).license, entitlements: [current.trim()] };
      changed = true;
    }

    if (!changed) continue;

    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    changedSlugs.push(slug);
    console.log(`📝 Updated ${slug}`);
  }

  if (changedSlugs.length > 0) {
    console.log("\n🔧 Normalizing updated product files...");
    await convertProducts({ slugs: changedSlugs, dryRun: false, check: false });
  } else {
    console.log("No live products required changes.");
  }

  console.log("\n✅ Migration complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err?.message || err);
  process.exit(1);
});
