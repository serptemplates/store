import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const galleryMock = vi.hoisted(() => vi.fn(() => <div data-testid="media-gallery" />));

vi.mock("@/components/product/ProductMediaGallery", () => ({
  ProductMediaGallery: galleryMock,
}));

let HybridProductOverview: typeof import("@/components/product/hybrid/HybridProductOverview")["HybridProductOverview"];

const baseInfoProps = {
  title: "Demo Product",
  description: "This is a demo description.",
  showWaitlist: false,
  checkoutCta: {
    mode: "checkout" as const,
    href: "/checkout",
    text: "Get it now",
    target: "_self" as const,
    opensInNewTab: false,
  },
  onCheckoutClick: vi.fn(),
};

const baseProps = {
  breadcrumbItems: [{ label: "Home", href: "/" }, { label: "Demo Product" }],
  productName: "Demo Product",
  images: ["https://example.com/demo.png"],
  selectedImageIndex: 0,
  onSelectImage: vi.fn(),
  brandLogoPath: null,
  infoProps: baseInfoProps,
};

describe("HybridProductOverview", () => {
  beforeAll(async () => {
    vi.stubGlobal("React", React);
    const module = await import("@/components/product/hybrid/HybridProductOverview");
    HybridProductOverview = module.HybridProductOverview;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    galleryMock.mockClear();
  });

  it("renders the media gallery when hideMedia is false", () => {
    render(<HybridProductOverview {...baseProps} hideMedia={false} />);

    expect(galleryMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("media-gallery")).toBeInTheDocument();
  });

  it("hides the media gallery when hideMedia is true", () => {
    render(<HybridProductOverview {...baseProps} hideMedia />);

    expect(galleryMock).not.toHaveBeenCalled();
  });
});
