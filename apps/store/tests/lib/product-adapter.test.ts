import { describe, expect, it } from "vitest";
import { productToHomeTemplate } from "@/lib/product-adapter";
import type { ProductData } from "@/lib/product-schema";

const baseProduct: ProductData = {
  slug: "sample-product",
  seo_title: "Sample Product",
  seo_description: "Sample description",
  product_page_url: "https://example.com/sample",
  purchase_url: "https://example.com/sample/buy",
  buy_button_destination: undefined,
  name: "Sample Product Downloader",
  tagline: "Download everything",
  description: "Sample product long description",
  github_repo_tags: [],
  features: ["Feature A", "Feature B"],
  product_videos: ["https://videos.example.com/demo.mp4"],
  related_videos: [],
  reviews: [
    {
      name: "Happy Customer",
      review: "Great tool!",
    },
  ],
  faqs: [
    {
      question: "How does it work?",
      answer: "Magic.",
    },
  ],
  pricing: {
    price: "$99",
    benefits: [],
  },
  screenshots: [],
  supported_operating_systems: [],
  categories: [],
  keywords: [],
  stripe: {
    price_id: "price_123",
    success_url: "https://example.com/success",
    cancel_url: "https://example.com/cancel",
    metadata: {},
  },
  layout_type: "landing",
  coming_soon: false,
  new_release: false,
  popular: false,
  brand: "SERP Apps",
};

describe("productToHomeTemplate", () => {
  it("derives platform name and default benefits", () => {
    const productWithoutPlatform: ProductData = { ...baseProduct, features: [] };
    const template = productToHomeTemplate(productWithoutPlatform, []);

    expect(template.platform).toBe("Sample Product");
    const pricing = template.pricing!;
    const benefits = pricing.benefits ?? [];
    expect(benefits.length).toBeGreaterThan(0);
    expect(benefits[0]).toContain("Instant access");
  });

  it("maps reviews and faqs into template sections", () => {
    const template = productToHomeTemplate(baseProduct, []);

    expect(template.testimonials).toEqual([
      {
        id: 0,
        name: "Happy Customer",
        testimonial: "Great tool!",
      },
    ]);

    expect(template.faqs).toEqual(baseProduct.faqs);
  });

  it("merges pricing cta settings and posts", () => {
    const product: ProductData = {
      ...baseProduct,
      pricing: {
        price: "$49",
        cta_href: "https://checkout.example.com",
        cta_text: "Get Started",
        benefits: ["One", "Two"],
      },
    };

    const posts = [
      {
        slug: "news",
        title: "Latest",
        date: "2024-01-01",
        excerpt: "Updates",
      },
    ];

    const template = productToHomeTemplate(product, posts as any);

    expect(template.ctaHref).toBe("https://checkout.example.com");
    expect(template.ctaText).toBe("Get Started");
    const pricing = template.pricing!;
    expect(pricing.benefits ?? []).toEqual(["One", "Two"]);
    expect(template.posts).toHaveLength(1);
    expect(template.postsTitle).toBe("Posts");
  });

  it("prefers buy_button_destination for CTA links when provided", () => {
    const destination = "https://external.example.com/landing";
    const product: ProductData = {
      ...baseProduct,
      buy_button_destination: destination,
    };

    const template = productToHomeTemplate(product, []);

    expect(template.ctaHref).toBe(destination);
    expect(template.pricing?.ctaHref).toBe(destination);
  });
});
