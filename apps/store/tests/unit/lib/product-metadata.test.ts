import { describe, expect, it } from "vitest";
import { buildProductMetadata } from "@/lib/products/metadata";
import type { ProductData } from "@/lib/products/product-schema";

const baseProduct = (): ProductData => ({
  slug: "sample-product",
  platform: "Sample",
  seo_title: " Sample Product Title ",
  seo_description: "  Sample description for SEO.  ",
  store_serp_co_product_page_url: "https://store.serp.co/product-details/product/sample-product",
  apps_serp_co_product_page_url: "https://apps.serp.co/sample-product",
  serp_co_product_page_url: "https://serp.co/products/sample-product/",
  serply_link: "https://serp.ly/sample-product",
  success_url: "https://apps.serp.co/checkout/success?product=sample-product&session_id={CHECKOUT_SESSION_ID}",
  cancel_url: "https://apps.serp.co/checkout?product=sample-product",
  buy_button_destination: undefined,
  name: "Sample Product",
  tagline: "Download everything",
  featured_image: "https://cdn.example.com/sample.jpg",
  featured_image_gif: "https://cdn.example.com/sample.gif",
  github_repo_url: undefined,
  github_repo_tags: [],
  chrome_webstore_link: undefined,
  firefox_addon_store_link: undefined,
  edge_addons_store_link: undefined,
  producthunt_link: undefined,
  features: [],
  description: "Long-form description",
  product_videos: [],
  related_videos: [],
  related_posts: [],
  screenshots: [],
  reviews: [],
  faqs: [],
  supported_operating_systems: [],
  supported_regions: [],
  categories: [],
  keywords: [],
  pricing: undefined,
  stripe: undefined,
  ghl: undefined,
  license: undefined,
  layout_type: "landing",
  status: "live",
  featured: false,
  new_release: false,
  popular: false,
  brand: "SERP Apps",
  permission_justifications: [],
});

describe("buildProductMetadata", () => {
  it("builds canonical metadata using SEO fields", () => {
    const metadata = buildProductMetadata(baseProduct());

    expect(metadata.title).toBe("Sample Product Title");
    expect(metadata.description).toBe("Sample description for SEO.");
    expect(metadata.alternates?.canonical).toBe("https://apps.serp.co/sample-product");
    expect(metadata.openGraph?.url).toBe("https://apps.serp.co/sample-product");
    expect(metadata.openGraph?.images).toEqual([
      { url: "https://cdn.example.com/sample.jpg" },
      { url: "https://cdn.example.com/sample.gif" },
    ]);
    const twitter = metadata.twitter as Record<string, unknown> | undefined;
    expect(twitter && "card" in twitter ? twitter.card : undefined).toBe("summary_large_image");
    expect(twitter && "images" in twitter ? twitter.images : undefined).toEqual([
      "https://cdn.example.com/sample.jpg",
      "https://cdn.example.com/sample.gif",
    ]);
  });

  it("falls back gracefully when media assets are missing", () => {
    const minimalProduct = {
      ...baseProduct(),
      featured_image: undefined,
      featured_image_gif: undefined,
    };

    const metadata = buildProductMetadata(minimalProduct);

    expect(metadata.openGraph?.images).toBeUndefined();
    const twitter = metadata.twitter as Record<string, unknown> | undefined;
    expect(twitter && "card" in twitter ? twitter.card : undefined).toBe("summary");
    expect(twitter && "images" in twitter ? twitter.images : undefined).toBeUndefined();
  });
});
