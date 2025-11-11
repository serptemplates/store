import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsDir = path.join(__dirname, "..", "data", "products");
const schemaPath = path.join(__dirname, "..", "data", "product.schema.json");

if (!fs.existsSync(productsDir)) {
  console.error("No products directory found at", productsDir);
  process.exit(1);
}

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
addFormats(ajv);

const validate = ajv.compile(schema);

const productFiles = fs.readdirSync(productsDir).filter((file) => file.toLowerCase().endsWith(".json"));

if (productFiles.length === 0) {
  console.error(`No product JSON files found in ${productsDir}`);
  process.exit(1);
}

let hasErrors = false;
const nameIndex = new Map();

for (const file of productFiles) {
  const filePath = path.join(productsDir, file);
  const raw = fs.readFileSync(filePath, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    hasErrors = true;
    console.error(`\n❌ ${file} failed to parse as JSON: ${(error instanceof Error && error.message) || error}`);
    continue;
  }
  const valid = validate(data);

  if (!valid) {
    hasErrors = true;
    console.error(`\n❌ ${file} failed schema validation:`);
    for (const error of validate.errors ?? []) {
      console.error(`  - ${error.instancePath || "/"} ${error.message ?? "invalid"}`);
      if (error.params) {
        console.error(`    details: ${JSON.stringify(error.params)}`);
      }
    }
  } else {
    console.log(`✅ ${file} matches schema`);
  }

  if (data?.status === "live") {
    const slug = typeof data?.slug === "string" ? data.slug.trim() : null;
    const ctaHref = data?.pricing?.cta_href;
    if (!slug || !ctaHref || typeof ctaHref !== "string") {
      hasErrors = true;
      console.error(`\n❌ ${file} missing required internal checkout CTA for live product.`);
    } else {
      const expected = `https://apps.serp.co/checkout/${slug}`;
      if (ctaHref !== expected) {
        hasErrors = true;
        console.error(`\n❌ ${file} has mismatched checkout CTA.`);
        console.error(`   Expected: ${expected}`);
        console.error(`   Received: ${ctaHref}`);
      }
    }
  }

  const normalizedName = typeof data?.name === "string" ? data.name.trim().toLowerCase() : null;
  if (normalizedName) {
    if (!nameIndex.has(normalizedName)) {
      nameIndex.set(normalizedName, []);
    }
    nameIndex.get(normalizedName).push(file);
  }
}

for (const [name, files] of nameIndex.entries()) {
  if (files.length > 1) {
    hasErrors = true;
    console.error(`\n❌ Duplicate product name "${name}" found in:`);
    for (const file of files) {
      console.error(`  - ${file}`);
    }
  }
}

if (hasErrors) {
  process.exit(1);
}
