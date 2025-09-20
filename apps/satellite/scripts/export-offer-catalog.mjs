import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsDir = path.join(__dirname, "..", "data", "products");
const docsDir = path.join(__dirname, "..", "..", "..", "docs");
const outputPath = path.join(docsDir, "offer-catalog.csv");

if (!fs.existsSync(productsDir)) {
  console.error(`Products directory not found at ${productsDir}`);
  process.exit(1);
}

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const files = fs
  .readdirSync(productsDir)
  .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
  .sort();

const headers = [
  "slug",
  "name",
  "status",
  "platform",
  "price_label",
  "price",
  "price_note",
  "cta_text",
  "stripe_price_id",
  "stripe_success_url",
  "stripe_cancel_url",
  "product_page_url",
  "purchase_url",
  "categories",
  "keywords",
];

function csvEscape(value) {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const rows = [headers.join(",")];

for (const file of files) {
  const filePath = path.join(productsDir, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const data = parse(raw) ?? {};

  const pricing = data.pricing ?? {};
  const stripe = data.stripe ?? {};

  const row = [
    data.slug ?? path.basename(file, path.extname(file)),
    data.name ?? "",
    data.status ?? "",
    data.platform ?? "",
    pricing.label ?? "",
    pricing.price ?? "",
    pricing.note ?? "",
    pricing.cta_text ?? "",
    stripe.price_id ?? "",
    stripe.success_url ?? "",
    stripe.cancel_url ?? "",
    data.product_page_url ?? "",
    data.purchase_url ?? "",
    Array.isArray(data.categories) ? data.categories.join(";") : "",
    Array.isArray(data.keywords) ? data.keywords.join(";") : "",
  ].map(csvEscape);

  rows.push(row.join(","));
}

fs.writeFileSync(outputPath, `${rows.join("\n")}\n`, "utf8");

console.log(`Exported offer catalog for ${files.length} products to ${outputPath}`);
