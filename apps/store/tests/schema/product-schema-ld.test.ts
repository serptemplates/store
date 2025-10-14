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
        store_serp_co_product_page_url: "https://store.serp.co/products/sample-product",
        apps_serp_co_product_page_url: "https://apps.serp.co/sample-product",
        serply_link: "https://serp.ly/sample-product",
        success_url: "https://apps.serp.co/checkout/success?product=sample-product&session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "https://apps.serp.co/checkout?product=sample-product",
        price: 49.99,
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
    if (schema.offers && !Array.isArray(schema.offers)) {
      expect(schema.offers['@type']).toBe('Offer');
      expect(schema.offers.price).toBe(49.99);
      expect(schema.offers.priceSpecification).toEqual(
        expect.objectContaining({
          '@type': 'UnitPriceSpecification',
          price: 49.99,
          priceCurrency: 'USD',
        }),
      );
    }
    expect(schema.image).toEqual([
      "https://cdn.example.com/image.jpg",
      "https://store.example.com/local-image.png",
    ]);
  });
});
