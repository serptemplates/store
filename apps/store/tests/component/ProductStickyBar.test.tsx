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

describe("ProductStickyBar", () => {
  describe("default variant", () => {
    it("renders a CTA button that triggers the provided callback", () => {
      const handleClick = vi.fn();

      render(
        <ProductStickyBar
          variant="default"
          show
          productName="Demo Product"
          ctaLabel="Get it now"
          onClick={handleClick}
          href="https://example.com/checkout"
          openInNewTab
        />,
      );

      const button = screen.getByRole("link", { name: "GET IT NOW" });
      button.click();
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe("marketplace variant", () => {
const baseProps: Omit<Extract<ProductStickyBarProps, { variant: "marketplace" }>, "product"> = {
      variant: "marketplace",
      show: true,
      productName: "Demo Product",
      priceLabel: "One-time payment",
      price: "$17.00",
      originalPrice: null,
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

vi.stubGlobal("React", React);

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

    it("renders the resolved checkout CTA for live products", () => {
      const product = buildProduct({ status: "live" });

      render(
        <ProductStickyBar
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
});
