import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { StickyPurchaseBar, type StickyPurchaseBarProps } from "@/components/product/StickyPurchaseBar";
import type { ProductData } from "@/lib/products/product-schema";

function buildProduct(overrides: Partial<ProductData>): ProductData {
  return {
    slug: "demo-product",
    name: "Demo Product",
    status: "live",
    tagline: "Demo tagline",
    description: "Demo description",
    seo_title: "Demo Product | Download",
    seo_description: "Demo description",
    serply_link: "https://serp.ly/demo-product",
    store_serp_co_product_page_url: "https://store.serp.co/product-details/product/demo-product",
    apps_serp_co_product_page_url: "https://apps.serp.co/demo-product",
    success_url: "https://apps.serp.co/checkout/success",
    cancel_url: "https://apps.serp.co/checkout",
    pricing: {
      label: "One-time payment",
      price: "$17.00",
      cta_text: "Get it Now",
    },
    screenshots: [],
    product_videos: [],
    related_videos: [],
    related_posts: [],
    features: [],
    faqs: [],
    reviews: [],
    supported_operating_systems: [],
    supported_regions: [],
    categories: [],
    keywords: [],
    permission_justifications: [],
    brand: "SERP Apps",
    ...overrides,
  } as ProductData;
}

describe("StickyPurchaseBar", () => {
  const baseProps: Omit<StickyPurchaseBarProps, "product"> = {
    priceLabel: "One-time payment",
    price: "$17.00",
    originalPrice: null,
    show: true,
    brandLogoPath: null,
    mainImageSource: null,
    waitlistEnabled: false,
    checkoutCta: {
      mode: "external",
      href: "https://example.com/checkout",
      text: "Buy Now",
      target: "_blank",
      rel: "noopener noreferrer",
      opensInNewTab: true,
      analytics: { destination: "external" },
    },
    onCheckoutClick: () => {},
  };

  it("uses the waitlist label when the product is pre-release", () => {
    const product = buildProduct({
      status: "pre_release",
    });

    render(
      <StickyPurchaseBar
        {...baseProps}
        product={product}
        waitlistEnabled
        onWaitlistClick={() => {}}
        checkoutCta={{
          mode: "pre_release",
          href: "#waitlist",
          text: "Get Notified",
          target: "_self",
          rel: undefined,
          opensInNewTab: false,
          analytics: { destination: "waitlist" },
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Get Notified" })).toBeInTheDocument();
    expect(screen.queryByText("Get it Now")).not.toBeInTheDocument();
  });

  it("honours the resolved checkout CTA label for live products", () => {
    const product = buildProduct({
      status: "live",
    });

    render(
      <StickyPurchaseBar
        {...baseProps}
        product={product}
        waitlistEnabled={false}
        checkoutCta={{
          mode: "external",
          href: "https://example.com/pay",
          text: "Buy Now",
          target: "_blank",
          rel: "noopener noreferrer",
          opensInNewTab: true,
          analytics: { destination: "external" },
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "Buy Now" })).toBeInTheDocument();
  });
});
