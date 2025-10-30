import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientHomeView } from "@/components/product/landers/default/ClientHomeView";
import type { BlogPostMeta } from "@/lib/blog";
import type { ProductVideoEntry } from "@/lib/products/video";
import type { SiteConfig } from "@/lib/site-config";
import type { PrimaryNavProps } from "@/lib/navigation";
import { createTestProduct } from "./lib/google-merchant/test-utils";

const analyticsMock = vi.hoisted(() => ({
  trackProductPageView: vi.fn(),
  trackCheckoutSuccessBanner: vi.fn(),
}));

const affiliateTrackingMock = vi.hoisted(() => ({
  useAffiliateTracking: vi.fn(() => ({ affiliateId: undefined, checkoutSuccess: false })),
}));

vi.mock("@/lib/analytics/product", () => ({
  trackProductPageView: analyticsMock.trackProductPageView,
  trackCheckoutSuccessBanner: analyticsMock.trackCheckoutSuccessBanner,
}));

vi.mock("@/components/product/useAffiliateTracking", () => ({
  useAffiliateTracking: affiliateTrackingMock.useAffiliateTracking,
}));

vi.mock("@repo/ui/lib/utils", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" "),
}));

vi.stubGlobal("React", React);

vi.mock("@repo/ui", async () => {
  const actual = await vi.importActual<typeof import("@repo/ui")>("@repo/ui");
  return {
    ...actual,
    Button: ({ children, ...props }: { children?: React.ReactNode }) => (
      <button type="button" {...props}>
        {children}
      </button>
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

describe("ClientHomeView", () => {
  beforeEach(() => {
    analyticsMock.trackProductPageView.mockClear();
    analyticsMock.trackCheckoutSuccessBanner.mockClear();
    affiliateTrackingMock.useAffiliateTracking.mockClear();
  });

  it("renders the primary sections including videos and permissions", async () => {
    const product = createTestProduct({
      status: "live",
      permission_justifications: [
        { permission: "downloads", justification: "Needed to save your own files." },
      ],
      faqs: [
        { question: "How does it work?", answer: "Click the download button on any page." },
      ],
      reviews: [
        { name: "Morgan", review: "Super helpful for our content team." },
      ],
      pricing: {
        price: "$27",
        cta_text: "Get It Now",
      },
      payment_link: {
        live_url: "https://buy.stripe.com/live-clienthome",
        test_url: "https://buy.stripe.com/test-clienthome",
      },
      related_posts: ["first-post"],
    });

    const posts: BlogPostMeta[] = [
      {
        slug: "first-post",
        title: "First Post",
        seoTitle: "First Post",
        description: "Test description",
        seoDescription: "Test description",
        date: "2024-01-01",
        author: "SERP",
        tags: ["test"],
        readingTime: "3 min read",
      },
    ];

    const videoEntries: ProductVideoEntry[] = [
      {
        slug: product.slug,
        url: "https://example.com/video.mp4",
        embedUrl: "https://example.com/embed/video",
        watchPath: "/videos/demo" as ProductVideoEntry["watchPath"],
        title: "Demo Video",
        description: "Walkthrough of the product",
        thumbnailUrl: "https://example.com/thumbnail.jpg",
        platform: "unknown",
        source: "primary",
      },
    ];

    const siteConfig: SiteConfig = {
      site: {
        name: "SERP",
        domain: "https://serp.co",
      },
    };

    const navProps: PrimaryNavProps = {
      siteName: "SERP",
      navLinks: [],
      productLinks: [],
      logoSrc: null,
    };

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

    expect(await screen.findByRole("heading", { name: "Videos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Permissions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get it now/i })).toBeInTheDocument();
  });
});
