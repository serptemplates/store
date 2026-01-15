import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MarketplaceProductPageView } from "@/components/product/landers/marketplace/MarketplaceProductPageView";
import type { SiteConfig } from "@/lib/site-config";
import { createTestProduct } from "./lib/google-merchant/test-utils";

const experienceMock = vi.hoisted(() => ({
  useProductPageExperience: vi.fn(() => ({
    affiliateId: undefined,
    checkoutSuccess: false,
    resolvedCta: {
      mode: "pre_release" as const,
      href: "#waitlist",
      text: "Get Notified",
      target: "_self" as const,
      opensInNewTab: false,
      analytics: { destination: "waitlist" as const },
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

// Make sure React is available globally for some mocked components
vi.stubGlobal("React", React);

describe("MarketplaceProductPageView", () => {
  beforeEach(() => {
    experienceMock.useProductPageExperience.mockClear();
  });

  it("always renders breadcrumbs on the marketplace layout (pre_release)", async () => {
    const product = createTestProduct({
      status: "pre_release",
      name: "Test Product",
    });

    const siteConfig: SiteConfig = {
      site: {
        name: "SERP",
        domain: "https://serp.co",
      },
    };

    render(<MarketplaceProductPageView product={product} siteConfig={siteConfig} />);

    const nav = await screen.findByLabelText("Breadcrumb");
    expect(nav).toBeInTheDocument();
    expect(within(nav).getByText("Home")).toBeInTheDocument();
    expect(within(nav).getByText("Products")).toBeInTheDocument();
    expect(within(nav).getByText("Test Product")).toBeInTheDocument();
  });

  it("renders multiple screenshots when provided (pre_release)", async () => {
    const product = createTestProduct({
      status: "pre_release",
      screenshots: [
        { url: "https://cdn.serp.co/test-shot-1.png", alt: "Shot One" },
        { url: "https://cdn.serp.co/test-shot-2.png", alt: "Shot Two" },
        { url: "https://cdn.serp.co/test-shot-3.png", alt: "Shot Three" },
      ],
    });

    const siteConfig: SiteConfig = {
      site: {
        name: "SERP",
        domain: "https://serp.co",
      },
    };

    render(<MarketplaceProductPageView product={product} siteConfig={siteConfig} />);

    // Ensure at least two distinct screenshots are visible
    expect(await screen.findByAltText("Shot One")).toBeInTheDocument();
    expect(screen.getByAltText("Shot Two")).toBeInTheDocument();
  });
});
