import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsDir = path.join(__dirname, "..", "data", "products");

const coverageChecks = [
  {
    path: "tagline",
    label: "Tagline",
    hint: "Add a compelling one-line hook",
  },
  {
    path: "description",
    label: "Long description",
    hint: "Provide a longer marketing description",
  },
  {
    path: "features",
    label: "Feature bullets",
    hint: "Add at least one feature bullet",
    test: (value) => Array.isArray(value) && value.length > 0,
  },
  {
    path: "product_videos",
    label: "Product videos",
    hint: "Link to at least one product video",
    test: (value) => Array.isArray(value) && value.length > 0,
  },
  {
    path: "screenshots",
    label: "Screenshots",
    hint: "Add at least one screenshot",
    test: (value) => Array.isArray(value) && value.length > 0,
  },
  {
    path: "reviews",
    label: "Reviews",
    hint: "Capture at least one testimonial",
    test: (value) => Array.isArray(value) && value.length > 0,
  },
  {
    path: "faqs",
    label: "FAQs",
    hint: "Document the top customer questions",
    test: (value) => Array.isArray(value) && value.length > 0,
  },
  {
    path: "pricing.benefits",
    label: "Pricing benefits",
    hint: "List the benefits that accompany the offer",
    test: (value) => Array.isArray(value) && value.length > 0,
  },
  {
    path: "supported_operating_systems",
    label: "Supported OS",
    hint: "List supported operating systems",
    test: (value) => Array.isArray(value) && value.length > 0,
  },
  {
    path: "categories",
    label: "Categories",
    hint: "Tag the product with at least one category",
    test: (value) => Array.isArray(value) && value.length > 0,
  },
  {
    path: "keywords",
    label: "Keywords",
    hint: "Add search keywords for the offer",
    test: (value) => Array.isArray(value) && value.length > 0,
  },
];

if (!fs.existsSync(productsDir)) {
  console.error("No products directory found at", productsDir);
  process.exit(1);
}

const productFiles = fs
  .readdirSync(productsDir)
  .filter((file) => file.toLowerCase().endsWith(".json"))
  .sort();

if (productFiles.length === 0) {
  console.error(`No product JSON files found in ${productsDir}`);
  process.exit(1);
}

function getByPath(data, pathKey) {
  return pathKey.split(".").reduce((acc, key) => {
    if (acc === undefined || acc === null) {
      return undefined;
    }
    return acc[key];
  }, data);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function defaultTest(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (value && typeof value === "object") {
    return Object.keys(value).length > 0;
  }
  return isNonEmptyString(value);
}

const perFieldStats = new Map();

for (const check of coverageChecks) {
  perFieldStats.set(check.path, { label: check.label, present: 0, missing: 0 });
}

const results = [];

for (const file of productFiles) {
  const filePath = path.join(productsDir, file);
  const raw = fs.readFileSync(filePath, "utf8");
  let data;

  try {
    data = JSON.parse(raw);
  } catch (error) {
    console.error(`Skipping ${filePath} due to JSON parse error:`, error);
    continue;
  }
  const slug = data?.slug ?? path.basename(file, path.extname(file));

  const missing = [];
  let completed = 0;

  for (const check of coverageChecks) {
    const value = getByPath(data, check.path);
    const testFn = check.test ?? defaultTest;
    const fulfilled = testFn(value, data);

    const stats = perFieldStats.get(check.path);
    if (stats) {
      if (fulfilled) {
        stats.present += 1;
      } else {
        stats.missing += 1;
      }
    }

    if (fulfilled) {
      completed += 1;
    } else {
      missing.push({ label: check.label, hint: check.hint });
    }
  }

  results.push({
    slug,
    file,
    completed,
    missing,
    coverage: completed / coverageChecks.length,
  });
}

results.sort((a, b) => a.coverage - b.coverage || a.slug.localeCompare(b.slug));

const totalProducts = results.length;
const checklistCount = coverageChecks.length;
const fullyCovered = results.filter((item) => item.missing.length === 0).length;

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

console.log("\n=== Product Information Coverage Report ===\n");
console.log(`Products analyzed: ${totalProducts}`);
console.log(`Checklist items per product: ${checklistCount}`);
console.log(`Products at 100% coverage: ${fullyCovered}`);

const worst = results.slice(0, 10);

console.log("\nLowest coverage products:");
for (const item of worst) {
  const missingLabels = item.missing.map((entry) => entry.label).join(", ");
  console.log(`- ${item.slug} ${formatPercent(item.coverage)} (missing: ${missingLabels || "none"})`);
}

console.log("\nField coverage across catalog:");
for (const check of coverageChecks) {
  const stats = perFieldStats.get(check.path);
  if (!stats) continue;
  const total = stats.present + stats.missing;
  const coverage = total === 0 ? 0 : stats.present / total;
  console.log(`- ${check.label}: ${formatPercent(coverage)} (${stats.present}/${total} complete)`);
}

console.log("\nPro tip: run with \`pnpm --filter @apps/store report:coverage\` after updating content.\n");
