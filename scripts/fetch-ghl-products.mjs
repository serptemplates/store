#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";

const root = process.cwd();
dotenv.config({ path: path.resolve(root, ".env.local") });
dotenv.config({ path: path.resolve(root, ".env") });

const pat = process.env.GHL_PAT_LOCATION || process.env.GHL_API_TOKEN || "";
const locationId = process.env.GHL_LOCATION_ID || "";

if (!pat) {
  console.error("⚠️  Missing GHL_PAT_LOCATION (or GHL_API_TOKEN) in environment.");
  process.exit(1);
}

if (!locationId) {
  console.error("⚠️  Missing GHL_LOCATION_ID in environment.");
  process.exit(1);
}

const DEFAULT_BASES = [
  "https://services.leadconnectorhq.com",
  "https://rest.gohighlevel.com",
  "https://rest.leadconnectorhq.com",
];

const customBases = (process.env.GHL_API_BASE_URL || "")
  .split(/[,\n]+/)
  .map((value) => value.trim())
  .filter(Boolean);

const baseUrls = customBases.length ? customBases : DEFAULT_BASES;

const pageSize = Number.parseInt(process.env.GHL_PRODUCTS_PAGE_SIZE || "100", 10);
const DEFAULT_VERSION = process.env.GHL_API_VERSION || "2021-07-28";

const customEndpoints = (process.env.GHL_PRODUCTS_ENDPOINTS || "")
  .split(/[,\n]+/)
  .map((value) => value.trim())
  .filter(Boolean);

const defaultEndpoints = [
  `/products/`,
  `/products`,
  `/locations/${locationId}/products`,
  `/locations/${locationId}/products/`,
  `/locations/${locationId}/store/products`,
  `/ecommerce/products`,
  `/ecom/products`,
  `/v1/locations/${locationId}/products`,
  `/v2/locations/${locationId}/products`,
];

const endpointCandidates = customEndpoints.length ? customEndpoints : defaultEndpoints;

function buildUrl(base, pathname, page) {
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);
  const offset = Math.max(page - 1, 0) * pageSize;
  url.searchParams.set("limit", String(pageSize));
  url.searchParams.set("offset", String(offset));
  if (!url.searchParams.has("locationId")) {
    url.searchParams.set("locationId", locationId);
  }
  return url;
}

async function tryEndpoint(base, pathname, page) {
  const url = buildUrl(base, pathname, page);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        Version: DEFAULT_VERSION,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    return { data, url: url.toString(), base, pathname };
  } catch (error) {
    throw new Error(`${base}${pathname} → ${error.message}`);
  }
}

function extractItems(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (payload.results && Array.isArray(payload.results.products)) return payload.results.products;
  return [];
}

function simplify(product) {
  return {
    id: product.id ?? product.productId ?? null,
    name: product.name ?? product.productName ?? null,
    description: product.description ?? "",
    price: product.price ?? null,
    status: product.status ?? product.visibility ?? null,
    createdAt: product.createdAt ?? product.created_at ?? null,
    updatedAt: product.updatedAt ?? product.updated_at ?? null,
    sku: product.sku ?? null,
    stripeProductId: product.stripeProductId ?? product.stripe_product_id ?? null,
    stripePriceId: product.stripePriceId ?? product.stripe_price_id ?? null,
    locationId: product.locationId ?? product.location_id ?? locationId,
    metadata: product.metadata ?? {},
    raw: product,
  };
}

async function fetchPage(page) {
  const errors = [];

  for (const base of baseUrls) {
    for (const candidate of endpointCandidates) {
      try {
        const { data, url, pathname } = await tryEndpoint(base, candidate, page);
        const items = extractItems(data);
        if (items.length > 0 || page === 1) {
          if (page === 1) {
            console.log(`Using endpoint: ${pathname} (base ${base})`);
            console.log(`Full URL: ${url}`);
          }
          return items.map(simplify);
        }
      } catch (error) {
        errors.push(error.message);
      }
    }
  }

  const message = errors.length
    ? `All endpoint attempts failed for page ${page}:\n - ${errors.join("\n - ")}`
    : `Unable to fetch page ${page}: no endpoints attempted.`;

  throw new Error(message);
}

async function fetchAll() {
  let page = 1;
  const results = [];
  let hasMore = true;

  while (hasMore) {
    const items = await fetchPage(page);
    if (items.length === 0) {
      hasMore = false;
    } else {
      results.push(...items);
      page += 1;
      if (items.length < pageSize) {
        hasMore = false;
      }
    }
  }

  return results;
}

(async () => {
  try {
    const products = await fetchAll();
    const timestamp = new Date().toISOString();
    const outputPath = path.resolve(root, "ghl-products.json");

    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          fetchedAt: timestamp,
          count: products.length,
          products,
        },
        null,
        2
      ),
      "utf8"
    );

    console.log(`Fetched ${products.length} product(s) from GHL.`);
    console.log(`Saved to ${outputPath}`);

    products.slice(0, 10).forEach((product) => {
      console.log(` - ${product.id}: ${product.name} (${product.status ?? "unknown"})`);
    });
    if (products.length > 10) {
      console.log("...");
    }
  } catch (error) {
    console.error("❌  Failed to fetch GHL products:", error.message);
    process.exitCode = 1;
  }
})();
