import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { MarketplaceProductPageView } from "@/components/product/landers/marketplace/MarketplaceProductPageView";
import type { SiteConfig } from "@/lib/site-config";
import { createTestProduct } from "../unit/lib/google-merchant/test-utils";

// Mock the experience hook to force waitlist modal open
vi.mock("@/components/product/hooks/useProductPageExperience", () => ({
  useProductPageExperience: () => ({
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
      isOpen: true, // force modal visible
      open: vi.fn(),
      close: vi.fn(),
    },
  }),
}));

vi.mock("@repo/ui/composites/Footer", () => ({
  Footer: () => null,
}));

describe("Pre-release waitlist modal", () => {
  it("renders GHL waitlist modal for pre_release products", async () => {
    // Ensure React is available for any components reading it from global
    // (some test helpers and composed components expect global React)
    // @ts-ignore
    globalThis.React = React;
    const product = createTestProduct({ status: "pre_release", name: "Pre Product" });
    const siteConfig: SiteConfig = { site: { name: "SERP", domain: "https://serp.co" } };

    render(<MarketplaceProductPageView product={product} siteConfig={siteConfig} />);

    // Primary CTA should be "Get Notified" on pre_release
    expect(await screen.findByRole("button", { name: /get notified/i })).toBeInTheDocument();

    // Modal displayed
    const dialog = await screen.findByRole("dialog", { name: /launching soon/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText(/join the waitlist/i)).toBeInTheDocument();
  });
});
