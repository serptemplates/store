import fs from "fs";
import path from "path";
import stripJsonComments from "strip-json-comments";

/**
 * Add optional_items to all downloader products pointing to the bundle product.
 * This script adds: stripe.optional_items = [{product_id: "prod_TPQDdWiCCy0HK2"}]
 */

const OPTIONAL_BUNDLE_PRODUCT_ID = "prod_TPQDdWiCCy0HK2";
const PRODUCTS_DIR = path.join(process.cwd(), "data/products");

async function addOptionalBundleToDownloaders() {
  const files = fs.readdirSync(PRODUCTS_DIR);
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    if (!file.endsWith(".json") || !file.includes("downloader")) {
      continue;
    }

    const filePath = path.join(PRODUCTS_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    let data = JSON.parse(stripJsonComments(content));

    // Check if already has optional_items
    if (data.stripe?.optional_items && data.stripe.optional_items.length > 0) {
      console.log(`⏭️  ${file} already has optional_items, skipping`);
      skipped++;
      continue;
    }

    // Initialize stripe object if not present
    if (!data.stripe) {
      data.stripe = {};
    }

    // Add optional_items
    data.stripe.optional_items = [
      {
        product_id: OPTIONAL_BUNDLE_PRODUCT_ID,
      },
    ];

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
    console.log(`✅ ${file}`);
    updated++;
  }

  console.log(
    `\n✨ Done! Updated ${updated} downloader product(s), skipped ${skipped}.`,
  );
}

addOptionalBundleToDownloaders().catch(console.error);
