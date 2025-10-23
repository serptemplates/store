import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { resolveProductPaymentLink } from "@/lib/products/payment-link";
import type { ProductData } from "@/lib/products/product-schema";

let originalStripeMode: string | undefined;

const baseProduct: ProductData = {
  slug: "sample-product",
  seo_title: "Sample",
  seo_description: "Sample product",
  store_serp_co_product_page_url: "https://store.serp.co/product-details/product/sample-product",
  apps_serp_co_product_page_url: "https://apps.serp.co/sample-product",
  serply_link: "https://serp.ly/sample-product",
  serp_co_product_page_url: "https://serp.co/products/sample",
  success_url: "https://apps.serp.co/checkout/success?product=sample-product&session_id={CHECKOUT_SESSION_ID}",
  cancel_url: "https://apps.serp.co/checkout?product=sample-product",
  buy_button_destination: undefined,
  name: "Sample Product",
  tagline: "Download everything",
  description: "Long description",
  github_repo_tags: [],
  product_videos: [],
  related_videos: [],
  related_posts: [],
  reviews: [],
  faqs: [],
  pricing: {
    price: "$19",
    benefits: [],
  },
  screenshots: [],
  supported_operating_systems: [],
  supported_regions: [],
  categories: [],
  keywords: [],
  features: [],
  stripe: {
    price_id: "price_123",
    metadata: {},
  },
  payment_link: {
    live_url: "https://buy.stripe.com/live-sample",
    test_url: "https://buy.stripe.com/test-sample",
  },
  layout_type: "landing",
  status: "live",
  featured: false,
  new_release: false,
  popular: false,
  brand: "SERP Apps",
  permission_justifications: [],
  ghl: {
    tag_ids: [],
    workflow_ids: [],
  },
  license: {
    entitlements: ["single_user"],
  },
};

beforeEach(() => {
  originalStripeMode = process.env.NEXT_PUBLIC_STRIPE_MODE;
});

afterEach(() => {
  if (originalStripeMode === undefined) {
    delete process.env.NEXT_PUBLIC_STRIPE_MODE;
  } else {
    process.env.NEXT_PUBLIC_STRIPE_MODE = originalStripeMode;
  }
});

describe("resolveProductPaymentLink", () => {
  it("selects the test payment link in test mode", () => {
    process.env.NEXT_PUBLIC_STRIPE_MODE = "test";
    const result = resolveProductPaymentLink(baseProduct);
    expect(result).toEqual({
      url: "https://buy.stripe.com/test-sample",
      linkId: "test-sample",
      provider: "stripe",
      variant: "test",
    });
  });

  it("falls back to live payment link when not in test mode", () => {
    process.env.NEXT_PUBLIC_STRIPE_MODE = "live";
    const result = resolveProductPaymentLink(baseProduct);
    expect(result).toEqual({
      url: "https://buy.stripe.com/live-sample",
      linkId: "live-sample",
      provider: "stripe",
      variant: "live",
    });
  });

  it("returns GHL payment link metadata", () => {
    const ghlProduct: ProductData = {
      ...baseProduct,
      payment_link: {
        ghl_url: "https://ghl.serp.co/widget/checkout",
      },
    };

    const result = resolveProductPaymentLink(ghlProduct);
    expect(result).toEqual({
      url: "https://ghl.serp.co/widget/checkout",
      linkId: "widget/checkout",
      provider: "ghl",
      variant: "live",
    });
  });
});
