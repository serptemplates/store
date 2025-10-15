#!/usr/bin/env tsx

/**
 * Upload products from `apps/store/data/products` to Google Merchant Center.
 *
 * Authentication uses a service account. Provide the following environment variables:
 * - GOOGLE_MERCHANT_ACCOUNT_ID (numeric Merchant Center account id)
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL
 * - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (use literal newlines or \n escapes)
 *
 * Optional configuration:
 * - GOOGLE_MERCHANT_COUNTRIES (comma separated, default "US")
 * - GOOGLE_MERCHANT_LANGUAGE (default "en")
 * - GOOGLE_MERCHANT_SITE_URL (default store landing url)
 * - GOOGLE_MERCHANT_APPS_URL (defaults to apps domain for mobileLink)
 *
 * Example usage:
 *   pnpm run merchant:upload -- --slug=onlyfans-downloader --dry-run
 *   pnpm run merchant:upload -- --countries=US,CA
 */

import crypto from "node:crypto";

import { listProductSlugs, loadProduct, loadSiteConfig } from "../../apps/store/lib/google-merchant/catalog";
import { loadServiceAccountCredentials } from "../../apps/store/lib/google-merchant/credentials";
import {
  buildMerchantProduct,
  type MerchantProduct,
} from "../../apps/store/lib/google-merchant/merchant-product";
import type { ProductData } from "../../apps/store/lib/products/product-schema";

type ScriptOptions = {
  slugs?: string[];
  dryRun: boolean;
  countries: string[];
  language: string;
};

function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const opts: ScriptOptions = {
    dryRun: false,
    countries: (process.env.GOOGLE_MERCHANT_COUNTRIES ?? "US")
      .split(",")
      .map((country) => country.trim().toUpperCase())
      .filter((country) => country.length === 2),
    language: (process.env.GOOGLE_MERCHANT_LANGUAGE ?? "en").trim().toLowerCase(),
  };

  for (const raw of args) {
    const normalized = raw.trim();
    if (normalized === "--") {
      continue;
    }
    if (normalized === "--dry-run") {
      opts.dryRun = true;
      continue;
    }

    if (normalized.startsWith("--slug=")) {
      const value = normalized.slice("--slug=".length);
      opts.slugs = value
        .split(",")
        .map((slug) => slug.trim())
        .filter(Boolean);
      continue;
    }

    if (normalized.startsWith("--slugs=")) {
      const value = normalized.slice("--slugs=".length);
      opts.slugs = value
        .split(",")
        .map((slug) => slug.trim())
        .filter(Boolean);
      continue;
    }

    if (normalized.startsWith("--countries=") || normalized.startsWith("--country=")) {
      const [key, value] = normalized.split("=");
      if (!value) {
        throw new Error(`Expected list after ${key}`);
      }
      opts.countries = value
        .split(",")
        .map((country) => country.trim().toUpperCase())
        .filter((country) => country.length === 2);
      continue;
    }

    if (normalized.startsWith("--language=")) {
      const value = normalized.slice("--language=".length);
      opts.language = value.trim().toLowerCase();
      continue;
    }

    throw new Error(`Unrecognised argument: ${normalized}`);
  }

  if (opts.countries.length === 0) {
    opts.countries = ["US"];
  }

  return opts;
}

function base64UrlEncode(input: Buffer | string): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken(config: {
  clientEmail: string;
  privateKey: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: config.clientEmail,
      scope: "https://www.googleapis.com/auth/content",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const data = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(data);
  signer.end();
  const signature = signer.sign(config.privateKey);
  const jwt = `${data}.${base64UrlEncode(signature)}`;

  const params = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to obtain access token (${response.status}): ${body}`);
  }

  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("Access token missing in response");
  }

  return json.access_token;
}

async function uploadProducts(options: {
  merchantId: string;
  accessToken?: string;
  products: MerchantProduct[];
  dryRun: boolean;
}): Promise<void> {
  if (options.products.length === 0) {
    console.log("No products to upload. Exiting.");
    return;
  }

  if (options.dryRun) {
    console.log("Dry run enabled. Products prepared for upload:");
    options.products.forEach((product) => {
      console.log(`- [${product.targetCountry}] ${product.offerId}: ${product.title} (${product.price.value} ${product.price.currency})`);
    });
    return;
  }

  if (!options.accessToken) {
    throw new Error("Missing access token for Merchant Center API call");
  }

  const entries = options.products.map((product, index) => ({
    batchId: index + 1,
    merchantId: options.merchantId,
    method: "insert",
    product,
  }));

  const response = await fetch(`https://shoppingcontent.googleapis.com/content/v2.1/${options.merchantId}/products/batch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entries }),
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`Merchant Center API returned ${response.status}: ${bodyText}`);
  }

  console.log("Upload response:", bodyText);
}

async function main() {
  const options = parseArgs();

  let merchantId = process.env.GOOGLE_MERCHANT_ACCOUNT_ID;
  const { clientEmail, privateKey } = loadServiceAccountCredentials(process.env);

  if (!merchantId) {
    if (options.dryRun) {
      merchantId = "dry-run";
    } else {
      throw new Error("Missing GOOGLE_MERCHANT_ACCOUNT_ID environment variable");
    }
  }

  if (!options.dryRun) {
    if (!clientEmail) {
      throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable");
    }
    if (!privateKey) {
      throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variable");
    }
  } else if (!clientEmail || !privateKey) {
    console.warn("Dry run detected without Google credentials. Skipping authentication.");
  }

  const siteConfig = loadSiteConfig();
  const excludedSlugs = new Set(siteConfig.excludeSlugs ?? []);
  const availableSlugs = listProductSlugs(excludedSlugs);

  const selectedSlugs = options.slugs && options.slugs.length > 0 ? options.slugs : availableSlugs;
  const missingSlugs = selectedSlugs.filter((slug) => !availableSlugs.includes(slug));
  if (missingSlugs.length > 0) {
    throw new Error(`The following slugs are not available (or excluded): ${missingSlugs.join(", ")}`);
  }

  const products: ProductData[] = selectedSlugs.map(loadProduct);

  const siteUrl = process.env.GOOGLE_MERCHANT_SITE_URL ?? "https://apps.serp.co";
  const appsUrl = process.env.GOOGLE_MERCHANT_APPS_URL ?? "https://apps.serp.co";

  const merchantProducts: MerchantProduct[] = [];
  for (const product of products) {
    for (const country of options.countries) {
      merchantProducts.push(
        buildMerchantProduct(product, {
          country,
          language: options.language,
          siteUrl,
          appsUrl,
        }),
      );
    }
  }

  let accessToken: string | undefined;
  if (!options.dryRun) {
    accessToken = await getAccessToken({ clientEmail: clientEmail!, privateKey: privateKey! });
  }

  await uploadProducts({
    merchantId,
    accessToken,
    products: merchantProducts,
    dryRun: options.dryRun,
  });

  console.log(`Prepared ${merchantProducts.length} Merchant Center product entries from ${products.length} catalogue item(s).`);
}

main().catch((error) => {
  console.error("[merchant-upload] failed:", error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
