import { describe, expect, it } from "vitest";

import { productSchema } from "@/lib/products/product-schema";

describe("productSchema", () => {
  it("rejects unknown properties to prevent stale fields", () => {
    const result = productSchema.safeParse({
      slug: "example",
      seo_title: "Example Product",
      seo_description: "Example description",
      store_serp_co_product_page_url: "https://store.serp.co/products/example",
      apps_serp_co_product_page_url: "https://apps.serp.co/example",
      serply_link: "https://serp.ly/example",
      success_url: "https://apps.serp.co/checkout/success?product=example",
      cancel_url: "https://apps.serp.co/checkout?product=example",
      name: "Example",
      tagline: "Example",
      description: "Example",
      layout_type: "landing",
      brand: "SERP Apps",
      unknown_field: "should trigger error",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues[0];
      expect(issue?.code).toBe("unrecognized_keys");
      expect(issue && "keys" in issue ? issue.keys : []).toContain("unknown_field");
    }
  });
});
