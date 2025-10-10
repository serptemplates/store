import { describe, expect, it } from "vitest";

import { generateProductSchemaLD, type SchemaProduct } from "@/schema/product-schema-ld";

describe("generateProductSchemaLD", () => {
  it("includes the supplied @id attribute and normalizes image URLs", () => {
    const schema = generateProductSchemaLD({
      product: {
        slug: "sample-product",
        seo_title: "Sample Product",
        seo_description: "Sample description",
        name: "Sample Product",
        description: "Sample description",
        product_page_url: "https://apps.serp.co/sample-product",
        purchase_url: "https://apps.serp.co/checkout/sample-product",
        price: "49.99",
        images: ["https://cdn.example.com/image.jpg", "/local-image.png"],
        isDigital: true,
        tagline: "Sample tagline",
        categories: [],
        keywords: [],
        features: [],
        layout_type: "landing",
        pricing: {
          price: "49.99",
          benefits: [],
        },
        supported_operating_systems: [],
        product_videos: [],
        related_videos: [],
        screenshots: [],
        faqs: [],
        github_repo_tags: [],
        supported_regions: [],
        reviews: [],
        pre_release: false,
        featured: false,
        new_release: false,
        popular: false,
        brand: "SERP Apps",
      } satisfies SchemaProduct,
      url: "https://store.example.com/sample-product",
      storeUrl: "https://store.example.com",
      currency: "USD",
      productId: "https://store.example.com/sample-product#product",
    });

    expect(schema["@id"]).toBe("https://store.example.com/sample-product#product");
    expect(schema.offers).toBeTruthy();
    expect(schema.image).toEqual([
      "https://cdn.example.com/image.jpg",
      "https://store.example.com/local-image.png",
    ]);
  });
});
