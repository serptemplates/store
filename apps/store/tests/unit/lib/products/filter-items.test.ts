import { describe, expect, it } from "vitest";

import { buildProductFilterItem } from "@/lib/products/filter-items";
import { createTestProduct } from "../../lib/google-merchant/test-utils";

describe("buildProductFilterItem", () => {
  it("includes derived categories and keywords", () => {
    const product = createTestProduct({
      slug: "youtube-downloader",
      categories: ["Downloader", "Video Downloader"],
      keywords: ["youtube ripper"],
      platform: "Web",
      new_release: true,
      popular: true,
    });

    const item = buildProductFilterItem(product);

    expect(item.slug).toBe("youtube-downloader");
    expect(item.categories).toEqual(["Downloader", "Video Downloaders"]);
    expect(item.keywords).toEqual([
      "Demo Product",
      "Web",
      "youtube ripper",
      "Downloader",
      "Video Downloaders",
    ]);
    expect(item.new_release).toBe(true);
    expect(item.popular).toBe(true);
  });

  it("falls back to baseline values when flags are disabled", () => {
    const product = createTestProduct({
      slug: "tokyomotion-downloader",
      categories: [],
      keywords: [],
      new_release: false,
      popular: undefined,
    });

    const item = buildProductFilterItem(product);

    expect(item.categories).toEqual(["Downloader"]);
    expect(item.new_release).toBe(false);
    expect(item.popular).toBe(false);
  });
});
