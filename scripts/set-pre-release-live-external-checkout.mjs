#!/usr/bin/env node
/**
 * Bulk flips catalog-visible pre_release products to live and forces their CTA to an external URL.
 *
 * This intentionally skips slugs listed in apps/store/data/site.config.json.excludeSlugs.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import stripJsonComments from "strip-json-comments";

const targetUrl = "https://serp.ly/serp-video-tools";
const repoRoot = process.cwd();
const productsDir = path.resolve(repoRoot, "apps/store/data/products");
const siteConfigPath = path.resolve(repoRoot, "apps/store/data/site.config.json");

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status ?? "unknown"}`);
  }
}

function readJsonWithComments(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const stripped = stripJsonComments.default ? stripJsonComments.default(raw) : stripJsonComments(raw);
  return JSON.parse(stripped);
}

function shouldRewriteCtaText(value) {
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /notified/i.test(trimmed);
}

function main() {
  if (!fs.existsSync(productsDir)) {
    throw new Error(`Missing products dir: ${productsDir}`);
  }
  if (!fs.existsSync(siteConfigPath)) {
    throw new Error(`Missing site config: ${siteConfigPath}`);
  }

  const siteConfig = JSON.parse(fs.readFileSync(siteConfigPath, "utf8"));
  const excluded = new Set(Array.isArray(siteConfig.excludeSlugs) ? siteConfig.excludeSlugs : []);

  const files = fs.readdirSync(productsDir).filter((f) => f.toLowerCase().endsWith(".json"));

  const changed = [];
  const skippedExcluded = [];
  const skippedNotPreRelease = [];

  for (const file of files) {
    const filePath = path.join(productsDir, file);
    const product = readJsonWithComments(filePath);

    const slug = typeof product.slug === "string" ? product.slug.trim() : "";
    if (!slug) {
      continue;
    }

    if (excluded.has(slug)) {
      if (product.status === "pre_release") {
        skippedExcluded.push(slug);
      }
      continue;
    }

    if (product.status !== "pre_release") {
      skippedNotPreRelease.push(slug);
      continue;
    }

    product.status = "live";
    product.pricing = product.pricing && typeof product.pricing === "object" ? product.pricing : {};
    product.pricing.checkout_url = targetUrl;
    if (shouldRewriteCtaText(product.pricing.cta_text)) {
      product.pricing.cta_text = "Get it Now";
    }

    fs.writeFileSync(filePath, `${JSON.stringify(product, null, 2)}\n`, "utf8");
    changed.push(slug);
  }

  fs.mkdirSync(path.resolve(repoRoot, "tmp"), { recursive: true });
  const receipt = {
    processedAt: new Date().toISOString(),
    targetUrl,
    changedCount: changed.length,
    changed,
    skippedExcludedCount: skippedExcluded.length,
    skippedExcluded,
  };
  fs.writeFileSync(
    path.resolve(repoRoot, "tmp/pre-release-live-external-checkout.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
    "utf8",
  );

  // Normalize and validate (converter also enforces field ordering).
  run("pnpm", ["--filter", "@apps/store", "convert:products"]);
  run("pnpm", ["--filter", "@apps/store", "validate:products"]);

  console.log("Done:", receipt);
}

main();

