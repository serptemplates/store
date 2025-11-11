import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import stripJsonComments from "strip-json-comments";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsDir = path.join(__dirname, "..", "data", "products");
const downloaderCategory = "Downloader";
const aiCategory = "Artificial Intelligence";

function normalize(value) {
  return value.trim().toLowerCase();
}

const files = fs.readdirSync(productsDir).filter((file) => file.toLowerCase().endsWith(".json"));

if (files.length === 0) {
  console.error(`No product JSON files found in ${productsDir}`);
  process.exit(1);
}

let touched = 0;

for (const file of files) {
  const filePath = path.join(productsDir, file);
  const raw = fs.readFileSync(filePath, "utf8");

  let data;
  try {
    data = JSON.parse(stripJsonComments(raw));
  } catch (error) {
    console.error(`Skipping ${filePath} due to JSON parse error:`, error);
    continue;
  }

  const slug =
    typeof data?.slug === "string" && data.slug.trim().length > 0
      ? data.slug.trim()
      : path.basename(file, path.extname(file));

  const categories = Array.isArray(data.categories)
    ? data.categories.filter((value) => typeof value === "string" && value.trim().length > 0)
    : [];

  const normalized = new Set(categories.map(normalize));
  let changed = false;

  if (slug.includes("downloader") && !normalized.has(normalize(downloaderCategory))) {
    categories.push(downloaderCategory);
    normalized.add(normalize(downloaderCategory));
    changed = true;
  }

  if (slug === "ai-voice-cloner-app" && !normalized.has(normalize(aiCategory))) {
    categories.push(aiCategory);
    normalized.add(normalize(aiCategory));
    changed = true;
  }

  if (!changed) {
    continue;
  }

  data.categories = categories;
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  touched += 1;
}

console.log(`Updated categories in ${touched} product file(s).`);
