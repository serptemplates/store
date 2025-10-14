import { describe, expect, it } from "vitest";
import { productToHomeTemplate } from "@/lib/products/product-adapter";
import type { ProductData } from "@/lib/products/product-schema";
import type { BlogPostMeta } from "@/lib/blog";

const baseProduct: ProductData = {
  slug: "sample-product",
  seo_title: "Sample Product",
  seo_description: "Sample description",
  store_serp_co_product_page_url: "https://store.serp.co/products/sample-product",
  apps_serp_co_product_page_url: "https://apps.serp.co/sample-product",
  serply_link: "https://serp.ly/sample-product",
  success_url: "https://apps.serp.co/checkout/success?product=sample-product&session_id={CHECKOUT_SESSION_ID}",
  cancel_url: "https://apps.serp.co/checkout?product=sample-product",
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
  supported_regions: [],
  categories: [],
  keywords: [],
  stripe: {
    price_id: "price_123",
    metadata: {},
  },
  layout_type: "landing",
  pre_release: false,
  featured: false,
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
        cta_href: "https://store.serp.co/checkout/example",
        cta_text: "Get Started",
        benefits: ["One", "Two"],
      },
    };

    const posts: BlogPostMeta[] = [
      {
        slug: "news",
        title: "Latest",
        description: "Updates",
        date: "2024-01-01",
        author: "Test Author",
        tags: [],
        image: undefined,
        readingTime: "1 min",
        category: undefined,
        dateModified: undefined,
      },
    ];

    const template = productToHomeTemplate(product, posts);

    expect(template.ctaHref).toBe("/checkout?product=sample-product");
    expect(template.ctaText).toBe("Get Started");
    const pricing = template.pricing!;
    expect(pricing.benefits ?? []).toEqual(["One", "Two"]);
    expect(pricing.ctaHref).toBe("/checkout?product=sample-product");
    expect(pricing.ctaText).toBe("Get Started");
    expect(template.posts).toHaveLength(1);
    expect(template.postsTitle).toBe("Posts");
  });

  it("prefers buy_button_destination for CTA links when provided", () => {
    const destination = "https://store.serp.co/external/landing";
    const product: ProductData = {
      ...baseProduct,
      buy_button_destination: destination,
      stripe: undefined,
    };

    const template = productToHomeTemplate(product, []);

    expect(template.ctaHref).toBe(destination);
    expect(template.pricing?.ctaHref).toBe(destination);
  });

  it("falls back to store product page when links are missing or unsupported", () => {
    const product: ProductData = {
      ...baseProduct,
      stripe: undefined,
      buy_button_destination: undefined,
      pricing: {
        price: baseProduct.pricing?.price,
        benefits: baseProduct.pricing?.benefits ?? [],
        cta_href: "https://example.com/not-allowed",
      },
      serply_link: "https://serp.ly/something",
      store_serp_co_product_page_url: "https://store.serp.co/products/sample-product",
      apps_serp_co_product_page_url: "https://apps.serp.co/sample-product",
    };

    const template = productToHomeTemplate(product, []);

    expect(template.ctaHref).toBe("https://store.serp.co/products/sample-product");
  });

  it("uses embedded checkout CTA when Stripe configuration is available", () => {
    const template = productToHomeTemplate(baseProduct, []);

    expect(template.ctaHref).toBe("/checkout?product=sample-product");
    expect(template.pricing?.ctaHref).toBe("/checkout?product=sample-product");
  });
});
