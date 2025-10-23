import { describe, expect, it } from "vitest";

import { productSchema } from "@/lib/products/product-schema";

function buildBaseProduct(): Record<string, unknown> {
  return {
    platform: "Example Platform",
    name: "Example Product",
    tagline: "Example tagline",
    slug: "example-product",
    description: "Example description",
    seo_title: "Example SEO Title",
    seo_description: "Example SEO Description",
    serply_link: "https://serp.ly/example-product",
    store_serp_co_product_page_url: "https://store.serp.co/product-details/product/example-product",
    apps_serp_co_product_page_url: "https://apps.serp.co/example-product",
    success_url: "https://apps.serp.co/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://apps.serp.co/checkout?product=example-product",
    pricing: {
      price: "$19.00",
    },
  };
}

describe("productSchema", () => {
  it("rejects unknown properties to prevent stale fields", () => {
    const result = productSchema.safeParse({
      slug: "example",
      seo_title: "Example Product",
      seo_description: "Example description",
      store_serp_co_product_page_url: "https://store.serp.co/product-details/product/example",
      apps_serp_co_product_page_url: "https://apps.serp.co/example",
      serp_co_product_page_url: "https://serp.co/products/example/",
      serply_link: "https://serp.ly/example",
      success_url: "https://apps.serp.co/checkout/success?product=example&session_id={CHECKOUT_SESSION_ID}",
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

  it("ignores legacy order_bump fields without failing validation", () => {
    const base = buildBaseProduct();

    const result = productSchema.safeParse({
      ...base,
      order_bump: {
        slug: "legacy-bump",
        price: "$29.00",
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("order_bump");
    }
  });

  it("requires a payment link when status is live", () => {
    const base = buildBaseProduct();
    const result = productSchema.safeParse({
      ...base,
      status: "live",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paymentLinkIssue = result.error.issues.find((issue) => issue.path.join(".") === "payment_link");
      expect(paymentLinkIssue?.message).toMatch(/must define a Stripe payment link/i);
    }
  });

  it("accepts a live product when a Stripe payment link is defined", () => {
    const base = buildBaseProduct();

    const result = productSchema.safeParse({
      ...base,
      status: "live",
      payment_link: {
        live_url: "https://buy.stripe.com/test_123456789",
      },
    });

    expect(result.success).toBe(true);
  });
});
