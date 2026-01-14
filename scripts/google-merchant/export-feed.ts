#!/usr/bin/env tsx

/**
 * Export Google Merchant Center feed data (CSV or XML) from `apps/store/data/products`.
 *
 * Example usage:
 *   pnpm run merchant:export -- --format=csv --output=merchant-feed.csv
 *   pnpm run merchant:export -- --format=xml --countries=US,CA
 */

import fs from "node:fs";
import path from "node:path";

import { listProductSlugs, loadProduct, loadSiteConfig } from "../../apps/store/lib/google-merchant/catalog";
import { serializeMerchantProductsToCsv, serializeMerchantProductsToXml } from "../../apps/store/lib/google-merchant/feed-formatter";
import { buildMerchantProduct } from "../../apps/store/lib/google-merchant/merchant-product";
import type { ProductData } from "../../apps/store/lib/products/product-schema";
import { getSiteBaseUrl, getStoreBaseUrl } from "../../apps/store/lib/urls";

type FeedFormat = "csv" | "xml";

type ScriptOptions = {
  slugs?: string[];
  countries: string[];
  language: string;
  format: FeedFormat;
  output?: string;
  siteUrl: string;
  appsUrl: string;
  channelTitle?: string;
  channelDescription?: string;
};

function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const defaultSiteUrl = process.env.GOOGLE_MERCHANT_SITE_URL ?? getSiteBaseUrl();
  const defaultAppsUrl = process.env.GOOGLE_MERCHANT_APPS_URL ?? getStoreBaseUrl();
  const options: ScriptOptions = {
    countries: (process.env.GOOGLE_MERCHANT_COUNTRIES ?? "US")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean),
    language: (process.env.GOOGLE_MERCHANT_LANGUAGE ?? "en").trim().toLowerCase(),
    format: "csv",
    siteUrl: defaultSiteUrl,
    appsUrl: defaultAppsUrl,
  };

  for (const raw of args) {
    const normalized = raw.trim();
    if (normalized === "--") {
      continue;
    }
    if (normalized.startsWith("--slugs=") || normalized.startsWith("--slug=")) {
      const value = normalized.slice(normalized.indexOf("=") + 1);
      options.slugs = value
        .split(",")
        .map((slug) => slug.trim())
        .filter(Boolean);
      continue;
    }
    if (normalized.startsWith("--countries=") || normalized.startsWith("--country=")) {
      const value = normalized.slice(normalized.indexOf("=") + 1);
      options.countries = value
        .split(",")
        .map((country) => country.trim().toUpperCase())
        .filter(Boolean);
      continue;
    }
    if (normalized.startsWith("--language=")) {
      options.language = normalized.slice("--language=".length).trim().toLowerCase();
      continue;
    }
    if (normalized.startsWith("--format=")) {
      const value = normalized.slice("--format=".length).trim().toLowerCase();
      if (value !== "csv" && value !== "xml") {
        throw new Error(`Unsupported format "${value}". Use "csv" or "xml".`);
      }
      options.format = value;
      continue;
    }
    if (normalized.startsWith("--output=")) {
      options.output = normalized.slice("--output=".length).trim();
      continue;
    }
    if (normalized.startsWith("--site-url=")) {
      options.siteUrl = normalized.slice("--site-url=".length).trim();
      continue;
    }
    if (normalized.startsWith("--apps-url=")) {
      options.appsUrl = normalized.slice("--apps-url=".length).trim();
      continue;
    }
    if (normalized.startsWith("--title=")) {
      options.channelTitle = normalized.slice("--title=".length).trim();
      continue;
    }
    if (normalized.startsWith("--description=")) {
      options.channelDescription = normalized.slice("--description=".length).trim();
      continue;
    }

    throw new Error(`Unrecognised argument: ${normalized}`);
  }

  if (options.countries.length === 0) {
    options.countries = ["US"];
  }

  return options;
}

function ensureOutputPath(filePath: string): string {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}

function ensureDefaultOutput(format: FeedFormat): string {
  const filename = format === "csv" ? "merchant-feed.csv" : "merchant-feed.xml";
  return path.resolve(process.cwd(), filename);
}

async function main() {
  const options = parseArgs();
  const siteConfig = loadSiteConfig();
  const excludedSlugs = new Set(siteConfig.excludeSlugs ?? []);
  const availableSlugs = listProductSlugs(excludedSlugs);

  const selectedSlugs = options.slugs && options.slugs.length > 0 ? options.slugs : availableSlugs;
  const missingSlugs = selectedSlugs.filter((slug) => !availableSlugs.includes(slug));
  if (missingSlugs.length > 0) {
    throw new Error(`The following slugs are not available (or excluded): ${missingSlugs.join(", ")}`);
  }

  const products: ProductData[] = selectedSlugs.map(loadProduct);
  const merchantProducts = products.flatMap((product) =>
    options.countries.map((country) =>
      buildMerchantProduct(product, {
        country,
        language: options.language,
        siteUrl: options.siteUrl,
        appsUrl: options.appsUrl,
      }),
    ),
  );

  let content: string;
  if (options.format === "csv") {
    content = serializeMerchantProductsToCsv(merchantProducts);
  } else {
    content = serializeMerchantProductsToXml(merchantProducts, {
      title: options.channelTitle,
      link: options.siteUrl,
      description: options.channelDescription,
    });
  }

  const outputPath = ensureOutputPath(options.output ?? ensureDefaultOutput(options.format));
  fs.writeFileSync(outputPath, content, "utf8");

  console.log(
    `[merchant-export] Wrote ${options.format.toUpperCase()} feed with ${merchantProducts.length} entr${
      merchantProducts.length === 1 ? "y" : "ies"
    } to ${outputPath}`,
  );
}

main().catch((error) => {
  console.error("[merchant-export] failed:", error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
