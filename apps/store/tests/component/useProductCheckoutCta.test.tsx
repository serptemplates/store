import "@testing-library/jest-dom/vitest";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import type { ResolvedHomeCta } from "@/components/product/landers/default/home-template.types";
import { useProductCheckoutCta } from "@/components/product/useProductCheckoutCta";
import type { ProductData } from "@/lib/products/product-schema";

const analyticsMock = vi.hoisted(() => ({
  trackProductCheckoutClick: vi.fn(),
}));

vi.mock("@/lib/analytics/product", () => ({
  trackProductCheckoutClick: analyticsMock.trackProductCheckoutClick,
}));

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
  name: "Sample Product Downloader",
  tagline: "Download everything",
  description: "Sample product long description",
  github_repo_tags: [],
  product_videos: [],
  related_videos: [],
  related_posts: [],
  reviews: [],
  faqs: [],
  pricing: {
    price: "$19",
    benefits: [],
    cta_href: "https://apps.serp.co/checkout/sample-product",
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

const waitlistProduct: ProductData = {
  ...baseProduct,
  status: "pre_release",
};

const checkoutResolvedCta: ResolvedHomeCta = {
  mode: "checkout",
  href: "https://apps.serp.co/checkout/sample-product",
  text: "Get It Now",
  target: "_self",
  rel: undefined,
  opensInNewTab: false,
  analytics: {
    destination: "checkout",
  },
};

const waitlistResolvedCta: ResolvedHomeCta = {
  mode: "pre_release",
  href: "https://ghl.serp.co/widget/form/p0UQfTbXR69iXnRlE953",
  text: "Get Notified",
  target: "_self",
  opensInNewTab: false,
  analytics: {
    destination: "waitlist",
  },
};

let originalStripeMode: string | undefined;
let windowOpenSpy: any;
let locationAssignSpy: ReturnType<typeof vi.fn>;
let originalLocation: Location;

beforeEach(() => {
  analyticsMock.trackProductCheckoutClick.mockReset();
  originalStripeMode = process.env.NEXT_PUBLIC_STRIPE_MODE;
  windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => ({} as Window));
  originalLocation = window.location;
  locationAssignSpy = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: {
      ...originalLocation,
      assign: locationAssignSpy,
    },
  });
});

afterEach(() => {
  windowOpenSpy.mockRestore();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
  if (originalStripeMode === undefined) {
    delete process.env.NEXT_PUBLIC_STRIPE_MODE;
  } else {
    process.env.NEXT_PUBLIC_STRIPE_MODE = originalStripeMode;
  }
});

describe("useProductCheckoutCta", () => {
  it("navigates to the internal checkout CTA and records analytics", () => {
    process.env.NEXT_PUBLIC_STRIPE_MODE = "test";

    const { result } = renderHook(() =>
      useProductCheckoutCta({
        product: baseProduct,
        homeCta: {
          cta: checkoutResolvedCta,
          ctaMode: checkoutResolvedCta.mode,
          ctaHref: checkoutResolvedCta.href,
          ctaText: checkoutResolvedCta.text,
          ctaOpensInNewTab: checkoutResolvedCta.opensInNewTab,
          ctaTarget: checkoutResolvedCta.target,
          ctaRel: checkoutResolvedCta.rel ?? null,
        },
        affiliateId: "aff-123",
      }),
    );

    act(() => {
      result.current.handleCtaClick("hero");
    });

    expect(analyticsMock.trackProductCheckoutClick).toHaveBeenCalledTimes(1);
    expect(analyticsMock.trackProductCheckoutClick).toHaveBeenCalledWith(baseProduct, {
      placement: "hero",
      destination: "checkout",
      affiliateId: "aff-123",
    });

    expect(windowOpenSpy).not.toHaveBeenCalled();
    expect(locationAssignSpy).toHaveBeenCalledWith("/checkout/sample-product");
  });

  it("triggers the waitlist callback for pre-release products without navigating away", () => {
    const onShowWaitlist = vi.fn();

    const { result } = renderHook(() =>
      useProductCheckoutCta({
        product: waitlistProduct,
        homeCta: {
          cta: waitlistResolvedCta,
          ctaMode: waitlistResolvedCta.mode,
          ctaHref: waitlistResolvedCta.href,
          ctaText: waitlistResolvedCta.text,
          ctaOpensInNewTab: waitlistResolvedCta.opensInNewTab,
          ctaTarget: waitlistResolvedCta.target,
        },
        onShowWaitlist,
      }),
    );

    act(() => {
      result.current.handleCtaClick("sticky_bar");
    });

    expect(onShowWaitlist).toHaveBeenCalledTimes(1);
    expect(analyticsMock.trackProductCheckoutClick).toHaveBeenCalledTimes(1);
    expect(analyticsMock.trackProductCheckoutClick).toHaveBeenCalledWith(waitlistProduct, {
      placement: "sticky_bar",
      destination: "waitlist",
      affiliateId: null,
    });

    expect(windowOpenSpy).not.toHaveBeenCalled();
  });
});
