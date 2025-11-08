import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientHomeView } from "@/components/product/landers/default/ClientHomeView";
import type { BlogPostMeta } from "@/lib/blog";
import type { ProductVideoEntry } from "@/lib/products/video";
import type { SiteConfig } from "@/lib/site-config";
import type { PrimaryNavProps } from "@/lib/navigation";
import type { ProductData } from "@/lib/products/product-schema";
import { createTestProduct } from "./lib/google-merchant/test-utils";

const experienceMock = vi.hoisted(() => ({
  useProductPageExperience: vi.fn(() => ({
    affiliateId: "mds",
    checkoutSuccess: false,
    resolvedCta: {
      mode: "external" as const,
      href: "https://buy.stripe.com/test_abc123",
      text: "Get It Now",
      target: "_blank" as const,
      rel: "noopener noreferrer",
      opensInNewTab: true,
      analytics: { destination: "external" as const },
    },
    handleCtaClick: vi.fn(),
    navigateToCta: vi.fn(),
    waitlist: {
      isOpen: false,
      open: vi.fn(),
      close: vi.fn(),
    },
  })),
}));

vi.mock("@/components/product/hooks/useProductPageExperience", () => ({
  useProductPageExperience: experienceMock.useProductPageExperience,
}));

vi.mock("@repo/ui", async () => {
  const actual = await vi.importActual<typeof import("@repo/ui")>("@repo/ui");
  return {
    ...actual,
    Button: ({ children, ...props }: { children?: React.ReactNode }) => (
      <a {...props}>{children}</a>
    ),
    Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    CardContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    CardHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    CardTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
    Input: (props: Record<string, unknown>) => <input {...props} />,
  };
});

vi.mock("@repo/ui/composites/Footer", () => ({
  Footer: () => null,
}));

vi.mock("embla-carousel-react", () => ({
  __esModule: true,
  default: () => null,
  useEmblaCarousel: () => [null, { reInit: vi.fn() }],
}));

vi.mock("@repo/ui/components/ui/carousel", () => ({
  Carousel: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CarouselPrevious: () => null,
  CarouselNext: () => null,
  useCarousel: () => ({
    carouselRef: () => undefined,
    api: undefined,
    orientation: "horizontal" as const,
    scrollPrev: () => {},
    scrollNext: () => {},
    canScrollPrev: false,
    canScrollNext: false,
  }),
}));

describe("ClientHomeView Stripe client_reference_id append", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    // ensure cookie is empty before each test
    document.cookie = "dub_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    experienceMock.useProductPageExperience.mockClear();
  });

  it("full Dub attribution flow: affiliate link → cookie → checkout session", async () => {
    // Simulate the real user journey:
    // 1. User visits serp.cc/mds → redirects to apps.serp.co/product?via=mds
    // 2. DubAnalytics reads via=mds from URL and sets the dub_id cookie
    // 3. User clicks buy button → system reads cookie → creates session with Dub metadata

    // Step 1: Simulate Dub redirect with via parameter
    // (DubAnalytics would normally read this from window.location.search)
    // Provide a realistic window.location so components relying on it (e.g., next/image) don't crash
    const testUrl = new URL('https://apps.serp.co/product?via=mds');
    Object.defineProperty(window, 'location', {
      value: {
        search: testUrl.search,
        hostname: testUrl.hostname,
        href: testUrl.href,
        origin: testUrl.origin,
        protocol: testUrl.protocol,
        host: testUrl.host,
        pathname: testUrl.pathname,
      },
      writable: true
    });

    // Step 2: Simulate DubAnalytics setting the cookie
    // (In real app, @dub/analytics/react does this automatically)
    document.cookie = 'dub_id=mds; path=/';

    // Step 3: User visits product page with stripe.price_id
    const product = createTestProduct({
      status: "live",
      pricing: {
        price: "$27",
        cta_text: "Get It Now",
      },
      payment_link: {
        live_url: "https://buy.stripe.com/live-test",
        test_url: "https://buy.stripe.com/test_xyz789",
      },
      stripe: {
        price_id: "price_1S99fz06JrOmKRCmwpZifMkf",
        metadata: {
          stripe_product_id: "prod_Sv6HHbpO7I9vt0"
        }
      }
    });

    const posts: BlogPostMeta[] = [];
    const videoEntries: ProductVideoEntry[] = [];
    const siteConfig: SiteConfig = { site: { name: "SERP", domain: "https://serp.co" } };
    const navProps: PrimaryNavProps = { siteName: "SERP", navLinks: [], productLinks: [], logoSrc: null };

    // Mock fetch for the checkout session API
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/test_session_123",
          status: "open"
        })
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    // Track redirect by mutating window.location.href in-place
    const mockLocation = window.location as unknown as { href: string };

    await act(async () => {
      render(
        <ClientHomeView
          product={product}
          posts={posts}
          siteConfig={siteConfig}
          navProps={navProps}
          videoEntries={videoEntries}
        />,
      );
    });

    const cta = await screen.findByRole("link", { name: /get it now/i });
    expect(cta).toBeInTheDocument();

    // Verify buy button is set up for interception (href="#")
    const hrefAttr = (cta as HTMLAnchorElement).getAttribute("href");
    expect(hrefAttr).toBe("#");

    // Step 4: User clicks buy button
    await act(async () => {
      cta.click();
    });

    // Step 5: Verify the system read the cookie and included Dub metadata
    expect(mockFetch).toHaveBeenCalledWith("/api/checkout/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        priceId: "price_1S99fz06JrOmKRCmwpZifMkf",
        quantity: 1,
        mode: "payment",
        successUrl: product.success_url,
        cancelUrl: product.cancel_url,
        // These come from reading the dub_id cookie set by the Dub SDK
        dubCustomerExternalId: "dub_id_mds",
        dubClickId: "dub_id_mds",
        clientReferenceId: "dub_id_mds"
      }),
    });

    // Step 6: Verify user is redirected to Stripe checkout
    expect(mockLocation.href).toBe("https://checkout.stripe.com/test_session_123");

    console.log("✅ FULL DUB ATTRIBUTION FLOW TEST PASSED");
    console.log("   - Affiliate link: serp.cc/mds");
    console.log("   - Cookie set: dub_id=<value from Dub>");
    console.log("   - Checkout session created with Dub metadata");
    console.log("   - Sale will be attributed to affiliate 'mds'");
  });
});
