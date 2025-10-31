import { describe, expect, it } from "vitest";
import { productToHomeTemplate } from "@/lib/products/product-adapter";
import type { ProductData } from "@/lib/products/product-schema";
import type { BlogPostMeta } from "@/lib/blog";

const baseProduct: ProductData = {
  slug: "sample-product",
  seo_title: "Sample Product",
  seo_description: "Sample description",
  store_serp_co_product_page_url: "https://store.serp.co/product-details/product/sample-product",
  apps_serp_co_product_page_url: "https://apps.serp.co/sample-product",
  serply_link: "https://serp.ly/sample-product",
  serp_co_product_page_url: "https://serp.co/products/sample-product/",
  success_url: "https://apps.serp.co/checkout/success?product=sample-product&session_id={CHECKOUT_SESSION_ID}",
  cancel_url: "https://apps.serp.co/checkout?product=sample-product",
  buy_button_destination: undefined,
  name: "Sample Product Downloader",
  tagline: "Download everything",
  description: "Sample product long description",
  github_repo_tags: [],
  chrome_webstore_link: undefined,
  firefox_addon_store_link: undefined,
  edge_addons_store_link: undefined,
  producthunt_link: undefined,
  features: ["Feature A", "Feature B"],
  product_videos: ["https://videos.example.com/demo.mp4"],
  related_videos: [],
  related_posts: [],
  reviews: [
    {
      name: "Happy Customer",
      review: "Great tool!",
      rating: 5,
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
  payment_link: {
    live_url: "https://buy.stripe.com/live-sample-product",
    test_url: "https://buy.stripe.com/test-sample-product",
  },
  layout_type: "landing",
  status: "live",
  featured: false,
  new_release: false,
  popular: false,
  brand: "SERP Apps",
  permission_justifications: [],
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

  it("merges pricing CTA settings and posts", () => {
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
        seoTitle: "Latest",
        description: "Updates",
        seoDescription: "Updates",
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

    expect(template.ctaMode).toBe("external");
    expect(template.ctaOpensInNewTab).toBe(true);
    expect(template.cta?.mode).toBe("external");
    expect(template.ctaHref).toBe("https://buy.stripe.com/test-sample-product");
    expect(template.ctaText).toBe("Get Started");
    expect(template.cta?.analytics?.destination).toBe("payment_link");
    expect(template.cta?.analytics?.paymentLink).toEqual({
      provider: "stripe",
      variant: "test",
      linkId: expect.any(String),
      url: "https://buy.stripe.com/test-sample-product",
    });
    const pricing = template.pricing!;
    expect(pricing.benefits ?? []).toEqual(["One", "Two"]);
    expect(pricing.ctaHref).toBe("https://buy.stripe.com/test-sample-product");
    expect(pricing.ctaText).toBe("Get Started");
    expect(pricing.subheading).toBeUndefined();
    expect(template.posts).toHaveLength(1);
    expect(template.postsTitle).toBe("Posts");
  });

  it("allows overriding or suppressing the pricing subheading", () => {
    const explicitSubheadingProduct: ProductData = {
      ...baseProduct,
      pricing: {
        price: "$59",
        benefits: [],
        subheading: "Custom pricing message",
      },
    };

    const templateWithExplicit = productToHomeTemplate(explicitSubheadingProduct, []);
    expect(templateWithExplicit.pricing?.subheading).toBe("Custom pricing message");

    const templateWithoutField = productToHomeTemplate(baseProduct, []);
    expect(templateWithoutField.pricing?.subheading).toBeUndefined();

    const hiddenSubheadingProduct: ProductData = {
      ...baseProduct,
      pricing: {
        price: baseProduct.pricing?.price,
        benefits: baseProduct.pricing?.benefits ?? [],
        subheading: " ",
      },
    };

    const templateWithBlank = productToHomeTemplate(hiddenSubheadingProduct, []);
    expect(templateWithBlank.pricing?.subheading).toBeUndefined();
  });

  it("prefers buy_button_destination for CTA links when provided", () => {
    const destination = "https://store.serp.co/external/landing";
    const product: ProductData = {
      ...baseProduct,
      buy_button_destination: destination,
      stripe: undefined,
      payment_link: undefined,
    };

    const template = productToHomeTemplate(product, []);

    expect(template.ctaMode).toBe("external");
    expect(template.ctaOpensInNewTab).toBe(true);
    expect(template.cta?.mode).toBe("external");
    expect(template.ctaHref).toBe(destination);
    expect(template.pricing?.ctaHref).toBe(destination);
  });

  it("falls back to GHL payment link when only ghl_url is provided", () => {
    const product: ProductData = {
      ...baseProduct,
      payment_link: {
        ghl_url: "https://ghl.serp.co/payment-link/test",
      },
    };

    const template = productToHomeTemplate(product, []);

    expect(template.ctaMode).toBe("external");
    expect(template.ctaOpensInNewTab).toBe(true);
    expect(template.ctaHref).toBe("https://ghl.serp.co/payment-link/test");
  });

  it("falls back to apps product page when links are missing or unsupported", () => {
    const product: ProductData = {
      ...baseProduct,
      stripe: undefined,
      payment_link: undefined,
      buy_button_destination: undefined,
      pricing: {
        price: baseProduct.pricing?.price,
        benefits: baseProduct.pricing?.benefits ?? [],
        cta_href: "https://example.com/not-allowed",
      },
      serply_link: "https://serp.ly/something",
      store_serp_co_product_page_url: "https://store.serp.co/product-details/product/sample-product",
      apps_serp_co_product_page_url: "https://apps.serp.co/sample-product",
    };

    const template = productToHomeTemplate(product, []);

    expect(template.ctaMode).toBe("external");
    expect(template.ctaOpensInNewTab).toBe(true);
    expect(template.ctaHref).toBe("https://apps.serp.co/sample-product");
  });

  it("routes pre-release products to the waitlist CTA by default", () => {
    const product: ProductData = {
      ...baseProduct,
      status: "pre_release",
      stripe: undefined,
      payment_link: undefined,
      buy_button_destination: undefined,
      pricing: {
        price: baseProduct.pricing?.price,
        benefits: baseProduct.pricing?.benefits ?? [],
        cta_text: "Get it Now",
      },
      featured_image: "https://cdn.example.com/hero.jpg",
      screenshots: [
        {
          url: "https://cdn.example.com/screenshot.png",
          alt: "Screenshot",
        },
      ],
      product_videos: ["https://cdn.example.com/demo.mp4"],
    };

    const template = productToHomeTemplate(product, []);

    expect(template.ctaMode).toBe("pre_release");
    expect(template.ctaHref).toBe("#waitlist");
    expect(template.ctaText).toBe("Get Notified");
    expect(template.ctaOpensInNewTab).toBe(false);
    expect(template.ctaTarget).toBe("_self");
    expect(template.pricing?.ctaHref).toBe("#waitlist");
    expect(template.pricing?.ctaText).toBe("Get Notified");
    expect(template.heroLightThumbnailSrc).toBeUndefined();
    expect(template.heroDarkThumbnailSrc).toBeUndefined();
    expect(template.videoUrl).toBeUndefined();
    expect(template.screenshots).toBeUndefined();
  });

  it("collects resource links from supported metadata fields", () => {
    const product: ProductData = {
      ...baseProduct,
      github_repo_url: "https://github.com/serpapps/sample-product",
      reddit_url: "https://www.reddit.com/r/sample/comments/abc",
      chrome_webstore_link: "https://chromewebstore.google.com/detail/demo/abcdef123456",
      firefox_addon_store_link: "https://addons.mozilla.org/en-US/firefox/addon/demo",
      edge_addons_store_link: "https://microsoftedge.microsoft.com/addons/detail/demo",
      producthunt_link: "https://www.producthunt.com/products/sample-product",
    };

    const template = productToHomeTemplate(product, []);

    expect(template.resourceLinks).toEqual([
      { label: "SERP", href: "https://serp.co/products/sample-product/" },
      { label: "Reddit Discussion", href: "https://www.reddit.com/r/sample/comments/abc" },
      { label: "GitHub Repository", href: "https://github.com/serpapps/sample-product" },
      { label: "Chrome Web Store", href: "https://chromewebstore.google.com/detail/demo/abcdef123456" },
      { label: "Firefox Add-ons", href: "https://addons.mozilla.org/en-US/firefox/addon/demo" },
      { label: "Microsoft Edge Add-ons", href: "https://microsoftedge.microsoft.com/addons/detail/demo" },
      { label: "Product Hunt", href: "https://www.producthunt.com/products/sample-product" },
    ]);
  });

  it("selects posts based on related_posts ordering", () => {
    const product: ProductData = {
      ...baseProduct,
      related_posts: ["post-b", "post-a"],
    };

    const posts: BlogPostMeta[] = [
      {
        slug: "post-a",
        title: "Post A",
        seoTitle: "Post A",
        description: "First",
        seoDescription: "First",
        date: "2024-01-01",
        author: "Author A",
        tags: [],
        image: undefined,
        readingTime: "1 min",
        category: undefined,
        dateModified: undefined,
      },
      {
        slug: "post-b",
        title: "Post B",
        seoTitle: "Post B",
        description: "Second",
        seoDescription: "Second",
        date: "2024-01-02",
        author: "Author B",
        tags: [],
        image: undefined,
        readingTime: "2 min",
        category: undefined,
        dateModified: undefined,
      },
      {
        slug: "post-c",
        title: "Post C",
        seoTitle: "Post C",
        description: "Third",
        seoDescription: "Third",
        date: "2024-01-03",
        author: "Author C",
        tags: [],
        image: undefined,
        readingTime: "3 min",
        category: undefined,
        dateModified: undefined,
      },
    ];

    const template = productToHomeTemplate(product, posts);
    const relatedSlugs = (template.posts ?? []).map((post) => post.slug);

    expect(relatedSlugs).toEqual(["post-b", "post-a"]);
  });
});
