import { describe, expect, it } from "vitest";

import {
  buildCategoryIndex,
  canonicalizeCategoryLabel,
  deriveProductCategories,
  getCategoryLabelFromSlug,
  slugifyCategoryLabel,
} from "@/lib/products/categories";
import { createTestProduct } from "../../lib/google-merchant/test-utils";

describe("categories helpers", () => {
  it("canonicalizes labels to primary casing", () => {
    expect(canonicalizeCategoryLabel("downloader")).toBe("Downloader");
    expect(canonicalizeCategoryLabel("  social media ")).toBe("Social Media");
    expect(canonicalizeCategoryLabel("video downloader")).toBe("Video Downloaders");
    expect(canonicalizeCategoryLabel("Image Downloader")).toBe("Image Downloaders");
    expect(canonicalizeCategoryLabel("Custom")).toBe("Custom");
  });

  it("derives categories from explicit list, removing duplicates and name/platform matches", () => {
    const product = createTestProduct({
      name: "Demo Product",
      platform: "Web",
      categories: [" Downloader ", "Adult", "demo product", "web", "Adult"],
    });

    expect(deriveProductCategories(product)).toEqual(["Downloader", "Adult"]);
  });

  it("falls back to heuristic detection when categories are missing", () => {
    const product = createTestProduct({
      slug: "tokyomotion-downloader",
      categories: [],
      keywords: [],
    });

    expect(deriveProductCategories(product)).toEqual(["Downloader"]);
  });

  it("slugifies category labels consistently", () => {
    expect(slugifyCategoryLabel("Social Media")).toBe("social-media");
    expect(slugifyCategoryLabel("  Downloader  ")).toBe("downloader");
    expect(slugifyCategoryLabel("Video Downloader")).toBe("video-downloaders");
    expect(slugifyCategoryLabel("Video+Tools")).toBe("video-tools");
  });

  it("builds a category index with occurrence counts", () => {
    const first = createTestProduct({
      slug: "first-downloader",
      categories: ["Downloader", "Adult"],
    });
    const second = createTestProduct({
      slug: "second-downloader",
      categories: ["Downloader"],
    });

    const index = buildCategoryIndex([first, second]);

    expect(index.get("downloader")).toEqual({
      label: "Downloader",
      slug: "downloader",
      count: 2,
    });
    expect(index.get("adult")).toEqual({
      label: "Adult",
      slug: "adult",
      count: 1,
    });
  });

  it("maps legacy singular slugs to canonical plural labels", () => {
    const product = createTestProduct({
      slug: "sample-video-tool",
      categories: ["Video Downloader"],
    });

    expect(getCategoryLabelFromSlug([product], "video-downloader")).toBe("Video Downloaders");
    expect(getCategoryLabelFromSlug([product], "video-downloaders")).toBe("Video Downloaders");
  });
});
