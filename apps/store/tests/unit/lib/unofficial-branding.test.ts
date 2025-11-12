import { describe, expect, it } from "vitest";

import type { ProductData } from "@/lib/products/product-schema";
import { resolveSeoProductName, resolveSeoTitle, resolveSeoDescription } from "@/lib/products/unofficial-branding";

const baseProduct = {
  name: "OnlyFans Downloader",
  slug: "onlyfans-downloader",
  platform: "OnlyFans",
  status: "live",
  tagline: "Download",
  description: "",
  seo_description: "Sample description.",
} as unknown as ProductData;

describe("unofficial branding helpers", () => {
  it("adds (Unofficial) to SEO titles when product uses a trademarked brand", () => {
    const product: ProductData = {
      ...baseProduct,
      trademark_metadata: {
        uses_trademarked_brand: true,
        trade_name: "OnlyFans",
        legal_entity: "OnlyFans Inc.",
      },
    };

    const title = resolveSeoTitle(product, "OnlyFans Downloader | Download content");
    expect(title).toBe("OnlyFans Downloader (Unofficial) | Download content");
  });

  it("does not duplicate the suffix if it already exists", () => {
    const product: ProductData = {
      ...baseProduct,
      trademark_metadata: {
        uses_trademarked_brand: true,
        trade_name: "OnlyFans",
        legal_entity: "OnlyFans Inc.",
      },
    };

    const title = resolveSeoTitle(product, "OnlyFans Downloader (Unofficial) | Download");
    expect(title).toBe("OnlyFans Downloader (Unofficial) | Download");
  });

  it("returns the original title if the product is not trademarked", () => {
    const title = resolveSeoTitle(baseProduct, "Generic Downloader | Download");
    expect(title).toBe("Generic Downloader | Download");
  });

  it("formats product names with the suffix for SEO contexts", () => {
    const product: ProductData = {
      ...baseProduct,
      trademark_metadata: {
        uses_trademarked_brand: true,
        trade_name: "OnlyFans",
        legal_entity: "OnlyFans Inc.",
      },
    };

    expect(resolveSeoProductName(product)).toBe("OnlyFans Downloader (Unofficial)");
  });

  it("prefixes compliance language for trademarked SEO descriptions", () => {
    const product: ProductData = {
      ...baseProduct,
      trademark_metadata: {
        uses_trademarked_brand: true,
        trade_name: "OnlyFans",
        legal_entity: "OnlyFans Inc.",
      },
    };

    expect(resolveSeoDescription(product)).toBe(
      "OnlyFans Downloader (Unofficial). Authorized-use only — download content you own or have permission to access. Sample description.",
    );
  });

  it("leaves base descriptions untouched for generic products", () => {
    const product: ProductData = {
      ...baseProduct,
      seo_description: "Purely generic copy.",
      trademark_metadata: {
        uses_trademarked_brand: false,
      },
    };

    expect(resolveSeoDescription(product)).toBe("Purely generic copy.");
  });
});
