import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ProductStickyBar, type ProductStickyBarProps } from "@/components/product/shared/ProductStickyBar";
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
    product_page_url: "https://apps.serp.co/demo-product",
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

describe("ProductStickyBar", () => {
  const baseProps: Omit<ProductStickyBarProps, "product"> = {
    show: true,
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

  vi.stubGlobal("React", React);

  it("renders the checkout CTA for live products and triggers the handler", () => {
    const product = buildProduct({ status: "live" });
    const handleClick = vi.fn((event: { preventDefault?: () => void }) => event.preventDefault?.());

    render(
      <ProductStickyBar
        {...baseProps}
        product={product}
        onCheckoutClick={handleClick}
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

    const link = screen.getByRole("link", { name: "Buy Now" });
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(handleClick).toHaveBeenCalled();
  });

  it("falls back to the waitlist label when the product is pre-release", () => {
    const product = buildProduct({ status: "pre_release" });

    render(
      <ProductStickyBar
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
  });
});
