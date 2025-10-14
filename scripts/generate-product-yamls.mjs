#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";
import YAML from "yaml";
import { parse } from "csv-parse/sync";
import { JSDOM } from "jsdom";

function resolveDataFile(filename) {
  const directPath = path.resolve(filename);
  if (fs.existsSync(directPath)) {
    return directPath;
  }
  const tmpPath = path.resolve("tmp", filename);
  if (fs.existsSync(tmpPath)) {
    return tmpPath;
  }
  return null;
}

const productsCsvPath = resolveDataFile("products.csv");
const ghlProductsPath = resolveDataFile("ghl-products.json");
const priceResultsPath = resolveDataFile("stripe-price-results.json");
const canonicalCsvPath = resolveDataFile("product-canonical-map.csv");
const outputDir = path.resolve("apps/store/data/products");

if (!productsCsvPath || !ghlProductsPath || !priceResultsPath) {
  console.error(
    "Missing required data files (products.csv, ghl-products.json, stripe-price-results.json). Ensure they exist in the repo root or tmp/."
  );
  process.exit(1);
}

const productsCsv = parse(fs.readFileSync(productsCsvPath, "utf8"), { columns: true, skip_empty_lines: true });
const ghlData = JSON.parse(fs.readFileSync(ghlProductsPath, "utf8"));
const priceResults = JSON.parse(fs.readFileSync(priceResultsPath, "utf8"));
const canonicalRows = canonicalCsvPath
  ? parse(fs.readFileSync(canonicalCsvPath, "utf8"), { columns: true, skip_empty_lines: true })
  : [];

const slugify = (value = "") => value.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const canonicalProductIdBySlug = new Map();
canonicalRows.forEach((row) => {
  if (row.slug && row.product_id) {
    canonicalProductIdBySlug.set(row.slug, row.product_id);
  }
});

const priceByProductId = new Map();
(priceResults.results || []).forEach((entry) => {
  if (entry.productId && entry.priceId) {
    priceByProductId.set(entry.productId, entry.priceId);
  }
});

const ghlBySlug = new Map();
(ghlData.products || []).forEach((item) => {
  const slug = (item.raw && item.raw.slug) || slugify(item.name || "");
  if (!slug) return;
  ghlBySlug.set(slug, item);
});

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const existingFiles = new Set(
  fs.readdirSync(outputDir)
    .filter((file) => file.endsWith(".yaml"))
    .map((file) => file.replace(/\.yaml$/i, ""))
);

const htmlToText = (html = "") => {
  if (!html) return "";
  try {
    const dom = new JSDOM(html);
    return dom.window.document.body.textContent?.replace(/\s+/g, " ").trim() || "";
  } catch {
    return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  }
};

const slugSet = new Set();
productsCsv.forEach((row) => {
  const slug = slugify(row["Name"]);
  if (slug) slugSet.add(slug);
});

const allSlugs = Array.from(new Set([...slugSet, ...ghlBySlug.keys()]));
let created = 0;
let skipped = 0;

for (const slug of allSlugs) {
  const productId = canonicalProductIdBySlug.get(slug);
  const priceId = productId ? priceByProductId.get(productId) : undefined;

  if (existingFiles.has(slug)) {
    skipped += 1;
    continue;
  }

  const ghi = ghlBySlug.get(slug);

  const name = ghi?.name || productsCsv.find((row) => slugify(row["Name"]) === slug)?.["Name"] || slug.replace(/-/g, " ").toUpperCase();
  const description = htmlToText(ghi?.raw?.description || "");
  const image = ghi?.raw?.image || "";
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://store.serp.co";

  const storeUrl = `${baseUrl}/products/${slug}`;
  const appsUrl = `https://apps.serp.co/${slug}`;

  const data = {
    slug,
    platform: name.split(' ')[0] || name,
    seo_title: `${name} | Download ${name} for Offline Access`,
    seo_description: description || `Download ${name} content for offline use with ease.`,
    store_serp_co_product_page_url: storeUrl,
    apps_serp_co_product_page_url: appsUrl,
    serply_link: `https://serp.ly/${slug}`,
    stripe: {
      price_id: priceId || 'PLACEHOLDER',
      metadata: {
        source: 'generated',
        stripe_product_id: productId || '',
      },
    },
    success_url: `${appsUrl}/checkout/success`,
    cancel_url: `${appsUrl}?checkout=cancel`,
    name,
    tagline: description.slice(0, 140) || `Download ${name} instantly to your device.`,
    featured_image: image || '',
    featured_image_gif: '',
    github_repo_url: '',
    github_repo_tags: [],
    features: [],
    description: description || `Get quick access to ${name} content for offline use.`,
    product_videos: [],
    related_videos: [],
    screenshots: [],
    faqs: [],
    supported_operating_systems: ['windows', 'macos'],
    status: 'draft',
    categories: [slug.replace(/-/g, ' ')],
    keywords: [slug.replace(/-/g, ' ')],
    pricing: {
      label: 'One-time payment',
      price: priceId ? '$17.00' : 'TODO',
      original_price: '',
      note: '',
      cta_text: 'Get it Now',
      benefits: [],
    },
  };

  const doc = new YAML.Document();
  doc.contents = data;
  fs.writeFileSync(path.join(outputDir, `${slug}.yaml`), doc.toString({ lineWidth: 0 }));
  created += 1;
}

console.log(`Generated ${created} new product YAML files. Skipped ${skipped} existing file(s).`);
