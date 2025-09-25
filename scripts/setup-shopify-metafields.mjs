#!/usr/bin/env node
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";

const rootDir = process.cwd();

dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });

const { ensureMetafieldDefinition, getStoreDomain, getAdminApiVersion } = await import("../lib/shopify-admin.mjs");

const definitions = [
  {
    name: "SERP Slug",
    namespace: "serp",
    key: "slug",
    type: "single_line_text_field",
    description: "Original SERP Apps slug identifier for this product.",
    ownerType: "PRODUCT",
    access: {
      admin: true,
      storefront: false,
    },
  },
  {
    name: "Purchase URL",
    namespace: "serp",
    key: "purchase_url",
    type: "url",
    description: "Legacy SERP checkout link (fallback when Shopify checkout is unavailable).",
    ownerType: "PRODUCT",
    access: {
      admin: true,
      storefront: false,
    },
  },
  {
    name: "Product Page URL",
    namespace: "serp",
    key: "product_page_url",
    type: "url",
    description: "Original SERP landing page URL for this product.",
    ownerType: "PRODUCT",
    access: {
      admin: true,
      storefront: false,
    },
  },
  {
    name: "GHL Config",
    namespace: "serp",
    key: "ghl_config",
    type: "json",
    description: "Go High Level configuration block (pipeline, stage, tags, custom fields).",
    ownerType: "PRODUCT",
    access: {
      admin: true,
      storefront: false,
    },
  },
  {
    name: "Stripe Config",
    namespace: "serp",
    key: "stripe_config",
    type: "json",
    description: "Legacy Stripe metadata retained for reference during migration.",
    ownerType: "PRODUCT",
    access: {
      admin: true,
      storefront: false,
    },
  },
  {
    name: "Feature List",
    namespace: "serp",
    key: "feature_list",
    type: "list.single_line_text_field",
    description: "Bulleted list of product features rendered in the theme.",
    ownerType: "PRODUCT",
    access: {
      admin: true,
      storefront: true,
    },
  },
  {
    name: "Testimonials JSON",
    namespace: "serp",
    key: "testimonials",
    type: "json",
    description: "Serialized testimonials (name + quote) displayed on the product page.",
    ownerType: "PRODUCT",
    access: {
      admin: true,
      storefront: true,
    },
  },
  {
    name: "FAQs JSON",
    namespace: "serp",
    key: "faqs",
    type: "json",
    description: "Serialized FAQ entries for the accordion component.",
    ownerType: "PRODUCT",
    access: {
      admin: true,
      storefront: true,
    },
  },
  {
    name: "Pricing Label",
    namespace: "serp",
    key: "pricing_label",
    type: "single_line_text_field",
    description: "Pricing plan label shown above the Shopify price (e.g. One-time payment).",
    ownerType: "PRODUCT",
    access: {
      admin: true,
      storefront: true,
    },
  },
  {
    name: "Pricing Note",
    namespace: "serp",
    key: "pricing_note",
    type: "single_line_text_field",
    description: "Supplemental note displayed beneath the pricing card.",
    ownerType: "PRODUCT",
    access: {
      admin: true,
      storefront: true,
    },
  },
  {
    name: "Pricing Benefits",
    namespace: "serp",
    key: "pricing_benefits",
    type: "list.single_line_text_field",
    description: "List of bullet points shown within the pricing card.",
    ownerType: "PRODUCT",
    access: {
      admin: true,
      storefront: true,
    },
  },
];

async function main() {
  console.info(
    `Ensuring ${definitions.length} Shopify metafield definitions on ${getStoreDomain()} (Admin API ${getAdminApiVersion()}).`,
  );

  for (const definition of definitions) {
    try {
      const result = await ensureMetafieldDefinition(definition);
      if (result.created) {
        console.info(`Created metafield definition serp.${definition.key}`);
      } else {
        console.info(`Metafield definition serp.${definition.key} already exists`);
      }
    } catch (error) {
      console.error(`Failed to ensure metafield definition serp.${definition.key}:`, error);
    }
  }
}

main().catch((error) => {
  console.error("Metafield setup failed:", error);
  process.exitCode = 1;
});
