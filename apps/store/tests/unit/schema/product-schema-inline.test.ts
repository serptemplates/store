import { describe, expect, it } from "vitest";

import { createSchemaProduct, generateProductSchemaLD, generateTranslatedResultsSchema } from "@/schema";
import { LEGAL_FAQ_TEMPLATE, productSchema } from "@/lib/products/product-schema";

const rawProduct = {
  platform: "Web",
  name: "Test Product",
  tagline: "Test Product Tagline",
  slug: "test-product",
  trademark_metadata: {
    uses_trademarked_brand: false,
  },
  description: "Download automation for every platform.",
  seo_title: "Test Product | SERP Apps",
  seo_description: "Download automation for every platform.",
  serply_link: "https://serp.ly/test-product",
  product_page_url: "https://apps.serp.co/test-product",
  serp_co_product_page_url: "https://serp.co/products/test-product/",
  cancel_url: "https://apps.serp.co/checkout?product=test-product",
  status: "live",
  featured_image: "https://cdn.serp.co/media/test-product.jpg",
  featured_image_gif: "https://cdn.serp.co/media/test-product.gif",
  pricing: {
    label: "Lifetime access",
    price: "$17.00",
    note: "",
    currency: "USD",
    availability: "InStock",
    cta_href: "https://apps.serp.co/checkout/test-product",
  },
  features: ["Automation toolkit"],
  benefits: [],
  categories: ["Downloader"],
  keywords: ["automation", "downloader"],
  permission_justifications: [
    { permission: "tabs", justification: "Needed to manage browser tabs" },
  ],
  supported_operating_systems: ["Chrome", "Firefox", "Edge"],
  supported_regions: ["Worldwide"],
  faqs: [{ ...LEGAL_FAQ_TEMPLATE }],
  payment: {
    provider: "stripe",
    stripe: {
      price_id: "price_1TEST1234567890",
    },
  },
} as const;

const productData = productSchema.parse(rawProduct);

describe("generateProductSchemaLD", () => {
  const schemaProduct = createSchemaProduct(productData, {
    price: rawProduct.pricing.price,
    images: [rawProduct.featured_image, rawProduct.featured_image_gif],
  });

  const result = generateProductSchemaLD({
    product: schemaProduct,
    url: "https://apps.serp.co/test-product",
    storeUrl: "https://apps.serp.co",
    productId: "https://apps.serp.co/test-product#product",
  });

  it("builds image objects with license metadata", () => {
    expect(Array.isArray(result.image)).toBe(true);
    const firstImage = Array.isArray(result.image) ? result.image[0] as Record<string, unknown> : undefined;
    expect(firstImage?.["@type"]).toBe("ImageObject");
    expect(firstImage?.license).toBe("https://github.com/serpapps/legal/blob/main/terms-conditions.md");
    expect(firstImage?.acquireLicensePage).toBe("https://serp.co/contact");
    expect(result.primaryImageOfPage).toEqual({ "@id": `${result["@id"]}-image-1` });
  });

  it("includes associated media references", () => {
    if (!Array.isArray(result.associatedMedia)) {
      throw new Error("associatedMedia should be an array");
    }
    expect(result.associatedMedia.length).toBeGreaterThan(0);
    expect(result.associatedMedia[0]).toMatchObject({ "@type": "ImageObject" });
  });

  it("marks available languages for translated results", () => {
    expect(Array.isArray(result.availableLanguage)).toBe(true);
    expect(result.availableLanguage).toContain("en");
  });
});

describe("generateTranslatedResultsSchema", () => {
  it("creates a translated results webpage schema referencing the product", () => {
    const translated = generateTranslatedResultsSchema({
      url: "https://apps.serp.co/test-product",
      name: "Test Product",
      productId: "https://apps.serp.co/test-product#product",
      storeUrl: "https://apps.serp.co",
    });

    expect(translated["@type"]).toBe("WebPage");
    expect(translated.mainEntity).toEqual({ "@id": "https://apps.serp.co/test-product#product" });
    expect(Array.isArray(translated.availableLanguage)).toBe(true);
    expect(translated.availableLanguage).toContain("en");
  });
});
