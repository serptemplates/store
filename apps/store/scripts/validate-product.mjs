import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import stripJsonComments from "strip-json-comments";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsDir = path.join(__dirname, "..", "data", "products");
const schemaPath = path.join(__dirname, "..", "data", "product.schema.json");

if (!fs.existsSync(productsDir)) {
  console.error("No products directory found at", productsDir);
  process.exit(1);
}

const schemaRaw = fs.readFileSync(schemaPath, "utf8");
const schema = JSON.parse(stripJsonComments(schemaRaw));
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
    data = JSON.parse(stripJsonComments(raw));
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
    const checkoutUrlOverride =
      typeof data?.pricing?.checkout_url === "string" ? data.pricing.checkout_url.trim() : "";
    const hasCheckoutOverride = checkoutUrlOverride.length > 0;

    if (hasCheckoutOverride) {
      // Live listings can intentionally route to an external offer page and may not have
      // a license entitlement or Stripe price configured in this repo.
      continue;
    }

    const entitlements = data?.license?.entitlements;
    const hasEntitlements = Array.isArray(entitlements)
      ? entitlements.some((entry) => typeof entry === "string" && entry.trim().length > 0)
      : typeof entitlements === "string"
        ? entitlements.trim().length > 0
        : false;
    if (!hasEntitlements) {
      hasErrors = true;
      console.error(`\n❌ ${file} missing license.entitlements for live product.`);
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

// Additional validation: ensure that live products' optional_items only reference
// repo-tracked products that have resolvable price IDs (or are pre_release).
// This prevents deployment of live products which would include optional items
// with unresolved prices.
{
  const products = productFiles.map((f) => {
    const filePath = path.join(productsDir, f);
    const raw = fs.readFileSync(filePath, "utf8");
    try {
      const data = JSON.parse(stripJsonComments(raw));
      const stripe = data?.payment?.stripe || {};
      const metadata = stripe?.metadata || {};
      const stripeProductId = metadata?.stripe_product_id || null;
      return { file: f, path: filePath, data, stripeProductId };
    } catch (err) {
      // Already handled above, so skip
      return null;
    }
  }).filter(Boolean);

  const indexByStripeProductId = new Map(products.map((p) => [p.stripeProductId, p]));
  const optionalIssues = [];

  for (const prod of products) {
    const data = prod.data;
    if (!data || data.status !== "live") continue;
    const optionalItems = data?.payment?.stripe?.optional_items || [];
    if (!optionalItems || optionalItems.length === 0) continue;
    for (const opt of optionalItems) {
      const targetId = opt && opt.product_id;
      if (!targetId) {
        optionalIssues.push({ file: prod.file, slug: data.slug, issue: 'optional item missing product_id', optional: opt });
        continue;
      }
      const target = indexByStripeProductId.get(targetId);
      if (!target) {
        // External Stripe product; report as warning but do not fail CI here.
        console.warn(`⚠️ ${prod.file} (${data.slug}) references external Stripe product ${targetId} as optional item; verify Stripe product has a price_id.`);
        continue;
      }
      const tdata = target.data;
      if (tdata.status === 'pre_release') {
        // Allowed - no price_id required for pre_release.
        continue;
      }
      const hasPrice = Boolean(
        (tdata.payment?.stripe && (tdata.payment.stripe.price_id || tdata.payment.stripe.test_price_id || tdata.payment.stripe.default_price))
      );
      if (!hasPrice) {
        optionalIssues.push({ file: prod.file, slug: data.slug, issue: `optional item references repo product without price_id: ${targetId}`, optional: opt });
      }
    }
  }

  if (optionalIssues.length > 0) {
    hasErrors = true;
    console.error('\n❌ Optional items validation failed for one or more products:');
    for (const i of optionalIssues) {
      console.error(`- ${i.slug} (${i.file}): ${i.issue}`);
    }
  }
}

if (hasErrors) {
  process.exit(1);
}
