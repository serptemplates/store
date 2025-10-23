import React, { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import ProductsFilter, {
  filterProducts,
  type ProductListItem,
} from "@/components/ProductsFilter";
import { shouldShowNewReleaseBanner } from "@/lib/products/badge-config";
import type { CategorySelection } from "@/components/ProductSearchBar";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.stubGlobal("React", React);

function buildProduct(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    slug: "sample-product",
  name: "Sample Product",
  categories: ["Downloader"],
  keywords: ["sample"],
  platform: "Sample",
  status: "live",
  new_release: false,
  popular: false,
  ...overrides,
  };
}

describe("ProductsFilter", () => {
  it("shows the New Release banner when the product is flagged", () => {
    const product = buildProduct({
      slug: "123movies-downloader",
      name: "123movies Downloader",
      new_release: true,
      categories: ["Downloader", "Movies & TV"],
    });

    const displayFlag =
      product.new_release && shouldShowNewReleaseBanner(product.slug);

    const html = renderToString(
      <ProductsFilter products={[{ ...product, new_release: displayFlag }]} />,
    );

    expect(html).toContain("New Release</div>");
  });

  it("does not show the New Release banner when flag is disabled", () => {
    const product = buildProduct({
      slug: "youtube-downloader",
      name: "YouTube Downloader",
      new_release: false,
      categories: ["Downloader", "Social Media"],
    });

    const html = renderToString(<ProductsFilter products={[product]} />);

    expect(html).not.toContain("New Release</div>");
  });

  it("retains products that match an explicitly selected category, even with additional tags", () => {
    const courseProduct = buildProduct({
      slug: "course-platforms-downloader",
      name: "Course Platforms Downloader",
      categories: ["Downloader", "Course Platforms"],
    });
    const otherProduct = buildProduct({
      slug: "social-downloader",
      name: "Social Media Downloader",
      categories: ["Downloader", "Social Media"],
    });

    const selection: CategorySelection = {
      mode: "custom",
      included: ["course platforms"],
    };

    const filtered = filterProducts([courseProduct, otherProduct], {
      searchQuery: "",
      categorySelection: selection,
      showPreRelease: true,
      showNewReleases: true,
    });

    expect(filtered.map((item) => item.slug)).toEqual(["course-platforms-downloader"]);
  });

  it("omits products that carry a deselected category when operating in Select All mode", () => {
    const adultProduct = buildProduct({
      slug: "adult-downloader",
      name: "Adult Downloader",
      categories: ["Downloader", "Adult"],
    });
    const safeProduct = buildProduct({
      slug: "generic-downloader",
      name: "Generic Downloader",
      categories: ["Downloader", "Social Media"],
    });

    const selection: CategorySelection = {
      mode: "all",
      excluded: ["adult"],
    };

    const filtered = filterProducts([adultProduct, safeProduct], {
      searchQuery: "",
      categorySelection: selection,
      showPreRelease: true,
      showNewReleases: true,
    });

    expect(filtered.map((item) => item.slug)).toEqual(["generic-downloader"]);
  });

  it("matches custom selections regardless of category casing", () => {
    const product = buildProduct({
      slug: "kajabi-downloader",
      name: "Kajabi Downloader",
      categories: ["Downloader", "Course Platforms"],
    });
    const other = buildProduct({
      slug: "youtube-downloader",
      name: "YouTube Downloader",
      categories: ["Downloader", "Social Media"],
    });

    const selection: CategorySelection = {
      mode: "custom",
      included: ["COURSE PLATFORMS"],
    };

    const filtered = filterProducts([product, other], {
      searchQuery: "",
      categorySelection: selection,
      showPreRelease: true,
      showNewReleases: true,
    });

    expect(filtered.map((item) => item.slug)).toEqual(["kajabi-downloader"]);
  });

  it("excludes products containing any of the categories marked off in Select All mode", () => {
    const adultProduct = buildProduct({
      slug: "adult-downloader",
      name: "Adult Downloader",
      categories: ["Downloader", "Adult"],
    });
    const moviesProduct = buildProduct({
      slug: "movies-downloader",
      name: "Movies Downloader",
      categories: ["Downloader", "Movies & TV"],
    });
    const safeProduct = buildProduct({
      slug: "podia-downloader",
      name: "Podia Downloader",
      categories: ["Downloader", "Course Platforms"],
    });

    const selection: CategorySelection = {
      mode: "all",
      excluded: ["adult", "movies & tv"],
    };

    const filtered = filterProducts([adultProduct, moviesProduct, safeProduct], {
      searchQuery: "",
      categorySelection: selection,
      showPreRelease: true,
      showNewReleases: true,
    });

    expect(filtered.map((item) => item.slug)).toEqual(["podia-downloader"]);
  });

  it("returns no products when custom selection is empty", () => {
    const product = buildProduct({
      slug: "generic-downloader",
      name: "Generic Downloader",
      categories: ["Downloader"],
    });

    const selection: CategorySelection = {
      mode: "custom",
      included: [],
    };

    const filtered = filterProducts([product], {
      searchQuery: "",
      categorySelection: selection,
      showPreRelease: true,
      showNewReleases: true,
    });

    expect(filtered).toEqual([]);
  });
});
