import { describe, expect, it } from "vitest";

import { LEGAL_FAQ_TEMPLATE, productSchema } from "@/lib/products/product-schema";

function buildBaseProduct(): Record<string, unknown> {
  return {
    platform: "Example Platform",
    name: "Example Product",
    tagline: "Example tagline",
    slug: "example-product",
    trademark_metadata: {
      uses_trademarked_brand: false,
    },
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
    faqs: [{ ...LEGAL_FAQ_TEMPLATE }],
    stripe: {
      price_id: "price_1EXAMPLE1234567890",
    },
  };
}

describe("productSchema", () => {
  it("rejects unknown properties to prevent stale fields", () => {
    const result = productSchema.safeParse({
      ...buildBaseProduct(),
      slug: "example",
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

  it("requires an internal checkout CTA when status is live", () => {
    const base = buildBaseProduct();
    const result = productSchema.safeParse({
      ...base,
      status: "live",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const ctaIssue = result.error.issues.find((issue) => issue.path.join(".") === "pricing.cta_href");
      expect(ctaIssue?.message).toMatch(/must define an internal checkout CTA/i);
    }
  });

  it("accepts a live product when pricing.cta_href points to internal checkout", () => {
    const base = buildBaseProduct();
    const result = productSchema.safeParse({
      ...base,
      status: "live",
      pricing: {
        price: (base.pricing as { price?: string })?.price,
        cta_href: "https://apps.serp.co/checkout/example-product",
      },
    });

    expect(result.success).toBe(true);
  });

  it("requires trademark metadata when a known brand alias is detected", () => {
    const result = productSchema.safeParse({
      ...buildBaseProduct(),
      name: "OnlyFans Downloader",
      slug: "onlyfans-downloader",
      seo_title: "OnlyFans Downloader",
      trademark_metadata: {
        uses_trademarked_brand: false,
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((entry) => entry.path.join(".") === "trademark_metadata.uses_trademarked_brand");
      expect(issue?.message).toMatch(/detected trademarked brand/i);
    }
  });

  it("allows trademarked products once metadata is populated", () => {
    const result = productSchema.safeParse({
      ...buildBaseProduct(),
      name: "OnlyFans Downloader",
      slug: "onlyfans-downloader",
      seo_title: "OnlyFans Downloader",
      trademark_metadata: {
        uses_trademarked_brand: true,
        trade_name: "OnlyFans",
        legal_entity: "Fenix International Limited",
      },
    });

    expect(result.success).toBe(true);
  });

  it("requires the downloader legal FAQ only when category includes 'Downloader'", () => {
    const missingFaqs = productSchema.safeParse({
      ...buildBaseProduct(),
      categories: ["Downloader"],
      faqs: [],
    });

    expect(missingFaqs.success).toBe(false);
    if (!missingFaqs.success) {
      const issue = missingFaqs.error.issues.find((entry) => entry.path.join(".") === "faqs");
      expect(issue?.message).toMatch(/must include the "Is this legal\?" faq entry/i);
    }

    const allowedFaqs = productSchema.safeParse({
      ...buildBaseProduct(),
      categories: ["UI Components"],
      faqs: [
        {
          question: "Does it support dark mode?",
          answer: "Yes, every block ships with light/dark variants.",
        },
      ],
    });

    expect(allowedFaqs.success).toBe(true);
  });
});
