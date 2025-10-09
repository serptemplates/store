import { describe, expect, it } from "vitest";

import { generateProductSchemaLD } from "@/schema/product-schema-ld";

describe("generateProductSchemaLD", () => {
  it("includes the supplied @id attribute and normalizes image URLs", () => {
    const schema = generateProductSchemaLD({
      product: {
        slug: "sample-product",
        name: "Sample Product",
        description: "Sample description",
        product_page_url: "https://apps.serp.co/sample-product",
        purchase_url: "https://apps.serp.co/checkout/sample-product",
        price: "49.99",
        images: ["https://cdn.example.com/image.jpg", "/local-image.png"],
        isDigital: true,
        categories: [],
        keywords: [],
        features: [],
        layout_type: "landing",
      } as any,
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
