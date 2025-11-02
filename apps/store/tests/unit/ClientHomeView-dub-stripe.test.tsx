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

  it("appends client_reference_id using dub_id cookie for Stripe links", async () => {
    // simulate arriving with a dub_id cookie present
    document.cookie = "dub_id=abc123; path=/";

    const product = createTestProduct({
      status: "live",
      pricing: {
        price: "$27",
        cta_text: "Get It Now",
      },
      payment_link: {
        live_url: "https://buy.stripe.com/live-test",
        test_url: "https://buy.stripe.com/test_abc123",
      },
    });

    const posts: BlogPostMeta[] = [];
    const videoEntries: ProductVideoEntry[] = [];
    const siteConfig: SiteConfig = { site: { name: "SERP", domain: "https://serp.co" } };
    const navProps: PrimaryNavProps = { siteName: "SERP", navLinks: [], productLinks: [], logoSrc: null };

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

    const href = (cta as HTMLAnchorElement).href;
    expect(href).toContain("buy.stripe.com");
    expect(href).toContain("client_reference_id=dub_id_abc123");
  });
});
