import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.join(__dirname, "..", "..", "..");
const sitesDir = path.join(repoRoot, "sites");
const docsDir = path.join(repoRoot, "docs");
const outputPath = path.join(docsDir, "domain-inventory.csv");

if (!fs.existsSync(sitesDir)) {
  console.error(`Sites directory not found at ${sitesDir}`);
  process.exit(1);
}

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const headers = ["site", "url", "buy_url", "gtm_id", "has_site_config"];
const rows = [headers.join(",")];

const siteDirs = fs
  .readdirSync(sitesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

function extractValue(source, key) {
  const pattern = new RegExp(`${key}\\s*:\\s*\"([^\"]*)\"`);
  const match = source.match(pattern);
  return match ? match[1] : "";
}

for (const site of siteDirs) {
  const siteConfigPath = path.join(sitesDir, site, "site.config.ts");
  let url = "";
  let buyUrl = "";
  let gtmId = "";
  let hasConfig = false;

  if (fs.existsSync(siteConfigPath)) {
    hasConfig = true;
    const content = fs.readFileSync(siteConfigPath, "utf8");
    url = extractValue(content, "url") || extractValue(content, "siteUrl");
    buyUrl = extractValue(content, "buyUrl");
    gtmId = extractValue(content, "gtmId");
  }

  const row = [site, url, buyUrl, gtmId, hasConfig ? "yes" : "no"].map((value) => {
    if (value == null) return "";
    const str = String(value);
    if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  });

  rows.push(row.join(","));
}

fs.writeFileSync(outputPath, `${rows.join("\n")}\n`, "utf8");

console.log(`Exported domain inventory for ${siteDirs.length} sites to ${outputPath}`);
