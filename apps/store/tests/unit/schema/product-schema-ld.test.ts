import { describe, expect, it } from "vitest";

import { generateBreadcrumbSchema, generateProductSchemaLD, type SchemaProduct } from "@/schema/product-schema-ld";

describe("generateProductSchemaLD", () => {
  it("includes the supplied @id attribute and normalizes image URLs", () => {
    const schema = generateProductSchemaLD({
      product: {
        slug: "sample-product",
        trademark_metadata: {
          uses_trademarked_brand: false,
        },
      seo_title: "Sample Product",
      seo_description: "Sample description",
      name: "Sample Product",
      description: "Sample description",
      product_page_url: "https://apps.serp.co/sample-product",
      serp_co_product_page_url: "https://serp.co/products/sample-product/",
      serply_link: "https://serp.ly/sample-product",
        price: 49.99,
        images: ["https://cdn.example.com/image.jpg", "/local-image.png"],
        isDigital: true,
        tagline: "Sample tagline",
        categories: [],
        keywords: [],
        features: [],
        benefits: [],
        pricing: {},
        supported_operating_systems: [],
        product_videos: [],
        related_videos: [],
        related_posts: [],
        screenshots: [],
        faqs: [],
        github_repo_tags: [],
        supported_regions: [],
        reviews: [],
        status: "live",
        featured: false,
        new_release: false,
        popular: false,
        brand: "SERP Apps",
        permission_justifications: [],
        resource_links: [],
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
      expect('priceSpecification' in schema.offers).toBe(false);
    }
    expect(Array.isArray(schema.image)).toBe(true);
    if (!Array.isArray(schema.image)) {
      throw new Error("Expected image to be an array of ImageObject");
    }

    expect(schema.image).toEqual([
      expect.objectContaining({
        "@type": "ImageObject",
        url: "https://cdn.example.com/image.jpg",
        contentUrl: "https://cdn.example.com/image.jpg",
        license: "https://github.com/serpapps/legal/blob/main/terms-conditions.md",
        acquireLicensePage: "https://serp.co/contact",
        creditText: "SERP Apps",
        representativeOfPage: true,
      }),
      expect.objectContaining({
        "@type": "ImageObject",
        url: "https://store.example.com/local-image.png",
        contentUrl: "https://store.example.com/local-image.png",
        license: "https://github.com/serpapps/legal/blob/main/terms-conditions.md",
      }),
    ]);
    expect(schema.primaryImageOfPage).toEqual({
      "@id": "https://store.example.com/sample-product#product-image-1",
    });
    expect(Array.isArray(schema.availableLanguage)).toBe(true);
    expect(schema.availableLanguage).toContain("en");
  });
});

describe("generateBreadcrumbSchema", () => {
  it("normalizes breadcrumb items to the apps.serp.co domain", () => {
    const schema = generateBreadcrumbSchema({
      items: [
        { name: "Home", url: "/" },
        { name: "Product", url: "https://store.serp.co/product/test" },
      ],
      storeUrl: "https://store.serp.co",
    });

    expect(schema.itemListElement).toEqual([
      expect.objectContaining({
        position: 1,
        name: "Home",
        item: "https://apps.serp.co/",
      }),
      expect.objectContaining({
        position: 2,
        name: "Product",
        item: "https://apps.serp.co/product/test",
      }),
    ]);
  });

  it("builds absolute URLs when provided relative breadcrumb paths", () => {
    const schema = generateBreadcrumbSchema({
      items: [
        { name: "Home", url: "/" },
        { name: "Section", url: "/section" },
      ],
      storeUrl: "https://example.com",
    });

    expect(schema.itemListElement).toEqual([
      expect.objectContaining({ item: "https://example.com/" }),
      expect.objectContaining({ item: "https://example.com/section" }),
    ]);
  });
});
