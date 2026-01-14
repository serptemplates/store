import fs from "fs";
import path from "path";
import stripJsonComments from "strip-json-comments";

const PRODUCTS_DIR = path.join(process.cwd(), "data/products");

function removeOptionalItemsFromProductsWithoutPrice() {
  const files = fs.readdirSync(PRODUCTS_DIR);
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const filePath = path.join(PRODUCTS_DIR, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(stripJsonComments(raw));

    const stripe = data?.payment?.stripe ?? data?.stripe;
    if (!stripe) {
      skipped++;
      continue;
    }

    const hasPrice = !!stripe.price_id || !!stripe.test_price_id;
    const hasOptionalItems = Array.isArray(stripe.optional_items) && stripe.optional_items.length > 0;

    if (!hasPrice && hasOptionalItems) {
      if (data?.payment?.stripe?.optional_items) {
        delete data.payment.stripe.optional_items;
      } else if (data?.stripe?.optional_items) {
        delete data.stripe.optional_items;
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
      console.log(`Removed optional_items from ${file} because price_id is missing`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}`);
}

removeOptionalItemsFromProductsWithoutPrice();
