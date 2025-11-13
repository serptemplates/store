import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import stripJsonComments from "strip-json-comments";

import { inferTrademarkedBrand } from "../lib/products/trademarked-brands";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productsDir = path.join(__dirname, "..", "data", "products");

function inferDeprecatedBrandField(product: Record<string, unknown>): string | null {
  const explicit =
    typeof product.trademarked_brand_name === "string" && product.trademarked_brand_name.trim().length > 0
      ? product.trademarked_brand_name.trim()
      : null;
  return explicit ?? inferTrademarkedBrand(product as { name?: string; platform?: string; slug?: string });
}

async function main() {
  const entries = await fs.readdir(productsDir);
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const filePath = path.join(productsDir, entry);
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(stripJsonComments(raw));

    const metadata = (() => {
      const existing = data.trademark_metadata;
      if (existing && typeof existing === "object" && !Array.isArray(existing)) {
        const parsed = existing as {
          uses_trademarked_brand?: boolean;
          trade_name?: string;
          legal_entity?: string;
        };
        return {
          uses_trademarked_brand: Boolean(parsed.uses_trademarked_brand),
          trade_name: typeof parsed.trade_name === "string" ? parsed.trade_name : undefined,
          legal_entity: typeof parsed.legal_entity === "string" ? parsed.legal_entity : undefined,
        };
      }
      return { uses_trademarked_brand: false };
    })();

    if (typeof metadata.uses_trademarked_brand !== "boolean") {
      metadata.uses_trademarked_brand = false;
    }

    if (metadata.uses_trademarked_brand) {
      const brandName = metadata.trade_name ?? inferTrademarkedBrand(data) ?? data.name ?? data.slug;
      metadata.trade_name = brandName ?? metadata.trade_name;
      metadata.legal_entity = metadata.legal_entity ?? metadata.trade_name ?? undefined;
    } else {
      const detectedBrand = inferDeprecatedBrandField(data);
      metadata.uses_trademarked_brand = Boolean(detectedBrand);
      if (metadata.uses_trademarked_brand && detectedBrand) {
        metadata.trade_name = detectedBrand;
        metadata.legal_entity = metadata.legal_entity ?? detectedBrand;
      } else {
        delete metadata.trade_name;
        delete metadata.legal_entity;
      }
    }

    data.trademark_metadata = metadata;
    delete data.uses_trademarked_brand;
    delete data.trademarked_brand_name;

    const serialized = `${JSON.stringify(data, null, 2)}\n`;
    await fs.writeFile(filePath, serialized, "utf8");
    console.log(
      `Updated ${entry} → trademark_metadata.uses_trademarked_brand=${metadata.uses_trademarked_brand}` +
        (metadata.trade_name ? `, trade_name=\"${metadata.trade_name}\"` : "") +
        (metadata.legal_entity ? `, legal_entity=\"${metadata.legal_entity}\"` : ""),
    );
  }
}

main().catch((error) => {
  console.error("Failed to backfill trademark metadata:", error);
  process.exit(1);
});
