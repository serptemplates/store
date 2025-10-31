import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { MarketplaceProductPageView } from "@/components/product/landers/marketplace/MarketplaceProductPageView";
import type { SiteConfig } from "@/lib/site-config";
import { createTestProduct } from "./lib/google-merchant/test-utils";

vi.mock("@repo/ui/lib/utils", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" "),
}));

vi.stubGlobal("React", React);

vi.mock("@repo/ui/composites/Footer", () => ({
  Footer: () => null,
}));

describe("MarketplaceProductPageView", () => {
  it("renders key sections and resource links for a pre-release product", async () => {
    const product = createTestProduct({
      status: "pre_release",
      categories: ["Video Tools", "Downloaders"],
      permission_justifications: [
        { permission: "downloads", justification: "Required to save assets locally." },
      ],
      faqs: [
        { question: "How do I install it?", answer: "Install from the Chrome Web Store." },
      ],
      reviews: [
        { name: "Jordan", review: "Works perfectly for batch downloads.", rating: 4.8 },
      ],
      supported_operating_systems: ["windows", "mac"],
      chrome_webstore_link: "https://chromewebstore.google.com/detail/demo/abcdef123456",
      producthunt_link: "https://www.producthunt.com/products/demo-downloader",
      github_repo_url: "https://github.com/serpapps/demo-downloader",
      reddit_url: "https://www.reddit.com/r/serpapps/comments/demo-post/",
    });

    const siteConfig: SiteConfig = {
      site: {
        name: "SERP",
        domain: "https://serp.co",
      },
    };

    render(<MarketplaceProductPageView product={product} siteConfig={siteConfig} />);

    expect(await screen.findByText(/definitive toolkit/i)).toBeInTheDocument();
    expect(screen.getByText(/how do i install it\?/i)).toBeInTheDocument();
    expect(screen.getByText(/works perfectly for batch downloads/i)).toBeInTheDocument();
    expect(screen.getByText(/required to save assets locally/i)).toBeInTheDocument();
    expect(screen.getByText(/links/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "SERP" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chrome Web Store" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Product Hunt" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub Repository" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reddit Discussion" })).toBeInTheDocument();
  });
});
