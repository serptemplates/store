import { act, cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "@testing-library/jest-dom/vitest";
import type { PrimaryNavbarProps } from "@/components/navigation/PrimaryNavbar";
import type { BlogPostMeta } from "@/lib/blog";
import type { ProductVideoEntry } from "@/lib/products/video";
import type { SiteConfig } from "@/lib/site-config";
import type { ProductData } from "@/lib/products/product-schema";
import { createTestProduct } from "./lib/google-merchant/test-utils";

const componentStubs = vi.hoisted(() => ({
  ClientHome: vi.fn((_props: unknown) => null),
  MarketplacePage: vi.fn((_props: unknown) => null),
  PrimaryNavbar: vi.fn((_props: unknown) => null),
}));

vi.mock("@/app/ClientHome", () => ({
  __esModule: true,
  default: componentStubs.ClientHome,
}));

vi.mock("@/app/[slug]/marketplace-page", () => ({
  __esModule: true,
  default: componentStubs.MarketplacePage,
}));

vi.mock("@/components/navigation/PrimaryNavbar", () => ({
  __esModule: true,
  default: componentStubs.PrimaryNavbar,
}));

vi.stubGlobal("React", React);

const getAllPostsMock = vi.hoisted(() => vi.fn<() => BlogPostMeta[]>(() => []));
const getAllProductsMock = vi.hoisted(() => vi.fn<() => ProductData[]>(() => []));
const getProductSlugsMock = vi.hoisted(() => vi.fn<() => string[]>(() => ["pre-release", "live-product"]));
const getProductDataMock = vi.hoisted(() => vi.fn<(slug: string) => ProductData>());
const getSiteConfigMock = vi.hoisted(() =>
  vi.fn<() => SiteConfig>(() => ({
    site: { name: "SERP", domain: "https://serp.co" },
  })),
);
const getProductVideoEntriesMock = vi.hoisted(() => vi.fn<() => ProductVideoEntry[]>(() => []));
const buildPrimaryNavPropsMock = vi.hoisted(() =>
  vi.fn<() => PrimaryNavbarProps>(() => ({
    siteName: "SERP",
    navLinks: [],
    productLinks: [],
    logoSrc: null,
  })),
);
const buildProductMetadataMock = vi.hoisted(() => vi.fn(() => ({ title: "Demo" })));
const notFoundMock = vi.hoisted(() =>
  vi.fn<() => never>(() => {
    throw new Error("NOT_FOUND");
  }),
);

vi.mock("@/lib/blog", () => ({
  getAllPosts: getAllPostsMock,
}));

vi.mock("@/lib/products/product", () => ({
  getAllProducts: getAllProductsMock,
  getProductData: getProductDataMock,
  getProductSlugs: getProductSlugsMock,
}));

vi.mock("@/lib/site-config", () => ({
  getSiteConfig: getSiteConfigMock,
}));

vi.mock("@/lib/navigation", () => ({
  buildPrimaryNavProps: buildPrimaryNavPropsMock,
}));

vi.mock("@/lib/products/video", () => ({
  getProductVideoEntries: getProductVideoEntriesMock,
}));

vi.mock("@/lib/products/metadata", () => ({
  buildProductMetadata: buildProductMetadataMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

const dynamicMock = (importer: () => Promise<unknown>) => {
  let Loaded: React.ComponentType<any> | null = null;
  importer().then((module) => {
    const resolved = module as { default?: React.ComponentType<any> };
    Loaded = resolved.default ?? (module as React.ComponentType<any>);
  });
  return (props: Record<string, unknown>) => {
    if (!Loaded) {
      throw new Error("Dynamic component not yet loaded");
    }
    return React.createElement(Loaded, props);
  };
};

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: dynamicMock,
}));

describe("apps/store/app/[slug]/page routing", () => {
  beforeEach(() => {
    componentStubs.ClientHome.mockClear();
    componentStubs.MarketplacePage.mockClear();
    componentStubs.PrimaryNavbar.mockClear();
    getProductDataMock.mockReset();
    getProductSlugsMock.mockReset();
    getAllProductsMock.mockReset();
    getAllPostsMock.mockReset();
    getSiteConfigMock.mockReset();
    getProductVideoEntriesMock.mockReset();
    buildPrimaryNavPropsMock.mockReset();
    buildProductMetadataMock.mockReset();
    notFoundMock.mockReset();
    getAllPostsMock.mockReturnValue([]);
    getAllProductsMock.mockReturnValue([]);
    getProductSlugsMock.mockReturnValue(["pre-release", "live-product"]);
    getProductDataMock.mockImplementation(() => {
      throw new Error("Product lookup not configured");
    });
    getSiteConfigMock.mockReturnValue({
      site: { name: "SERP", domain: "https://serp.co" },
    });
    getProductVideoEntriesMock.mockReturnValue([]);
    buildPrimaryNavPropsMock.mockReturnValue({
      siteName: "SERP",
      navLinks: [],
      productLinks: [],
      logoSrc: null,
    });
    buildProductMetadataMock.mockReturnValue({ title: "Demo" });
    notFoundMock.mockImplementation(() => {
      throw new Error("NOT_FOUND");
    });
    cleanup();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("renders the marketplace lander for pre-release products", async () => {
    const preReleaseProduct = createTestProduct({
      slug: "pre-release",
      status: "pre_release",
    });

    getProductSlugsMock.mockReturnValue(["pre-release"]);
    getProductDataMock.mockImplementation((slug: string) => {
      if (slug === "pre-release") {
        return preReleaseProduct;
      }
      throw new Error(`Unexpected slug ${slug}`);
    });
    getAllProductsMock.mockReturnValue([preReleaseProduct]);

    const pageModule = await import("@/app/[slug]/page");
    const Page = pageModule.default;
    await Promise.resolve();

    const element = await Page({ params: Promise.resolve({ slug: "pre-release" }) });
    await act(async () => {
      render(element);
    });

    expect(componentStubs.MarketplacePage).toHaveBeenCalledTimes(1);
    const marketplaceCall = componentStubs.MarketplacePage.mock.calls[0];
    if (!marketplaceCall) {
      throw new Error("MarketplacePage was not invoked");
    }
    const marketplaceProps = marketplaceCall[0];
    if (!marketplaceProps) {
      throw new Error("MarketplacePage props missing");
    }
    expect(marketplaceProps).toMatchObject({
      product: preReleaseProduct,
      siteConfig: expect.any(Object),
    });
    expect(componentStubs.ClientHome).not.toHaveBeenCalled();
  });

  it("renders the default home lander for live products", async () => {
    const liveProduct = createTestProduct({
      slug: "live-product",
      status: "live",
      payment_link: {
        live_url: "https://buy.stripe.com/live-product",
        test_url: "https://buy.stripe.com/test-product",
      },
    });

    getProductSlugsMock.mockReturnValue(["live-product"]);
    getProductDataMock.mockImplementation((slug: string) => {
      if (slug === "live-product") {
        return liveProduct;
      }
      throw new Error(`Unexpected slug ${slug}`);
    });
    getAllProductsMock.mockReturnValue([liveProduct]);

    const pageModule = await import("@/app/[slug]/page");
    const Page = pageModule.default;
    await Promise.resolve();

    const element = await Page({ params: Promise.resolve({ slug: "live-product" }) });
    await act(async () => {
      render(element);
    });

    expect(componentStubs.ClientHome).toHaveBeenCalledTimes(1);
    const clientHomeCall = componentStubs.ClientHome.mock.calls[0];
    if (!clientHomeCall) {
      throw new Error("ClientHome was not invoked");
    }
    const clientHomeProps = clientHomeCall[0];
    if (!clientHomeProps) {
      throw new Error("ClientHome props missing");
    }
    expect(clientHomeProps).toMatchObject({
      product: liveProduct,
    });
    expect(componentStubs.MarketplacePage).not.toHaveBeenCalled();
  });

  it("calls notFound when slug is unknown", async () => {
    getProductSlugsMock.mockReturnValue(["known"]);
    getProductDataMock.mockImplementation(() => {
      throw new Error("Should not be called");
    });

    const pageModule = await import("@/app/[slug]/page");
    const Page = pageModule.default;

    await expect(
      Page({ params: Promise.resolve({ slug: "missing" }) }),
    ).rejects.toThrowError("NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(componentStubs.ClientHome).not.toHaveBeenCalled();
    expect(componentStubs.MarketplacePage).not.toHaveBeenCalled();
  });
});
