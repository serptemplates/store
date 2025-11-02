import { describe, expect, it } from "vitest";

import {
  buildMerchantProduct,
  extractPrice,
  extractSalePrice,
  sanitizeDescription,
} from "@/lib/google-merchant/merchant-product";
import { createTestProduct } from "./test-utils";

describe("merchant-product helpers", () => {
  it("buildMerchantProduct maps product fields into the Merchant payload", () => {
    const product = createTestProduct({
      seo_description: "Turn\n\n chaos into clarity.",
    });

    const result = buildMerchantProduct(product, {
      country: "US",
      language: "en",
      siteUrl: "https://store.serp.co",
      appsUrl: "https://apps.serp.co",
    });

    expect(result.offerId).toBe("demo-product");
    expect(result.link).toBe("https://apps.serp.co/demo-product");
    expect(result.mobileLink).toBe("https://store.serp.co/product-details/product/demo-product");
    expect(result.description).toBe("Turn chaos into clarity.");
    expect(result.price).toEqual({ value: "19.00", currency: "USD" });
    expect(result.salePrice).toEqual({ value: "19.00", currency: "USD" });
    expect(result.availability).toBe("out of stock");
    expect(result.brand).toBe("SERP Apps");
    expect(result.googleProductCategory).toBe("Software > Computer Software");
    expect(result.productTypes).toEqual(["Artificial Intelligence", "Platform::Web"]);
    expect(result.shipping).toStrictEqual([
      { country: "US", price: { value: "0.00", currency: "USD" } },
    ]);
    expect(result.additionalImageLinks).toEqual([
      "https://cdn.serp.co/demo-product-1.png",
      "https://cdn.serp.co/demo-product-2.png",
    ]);
  });

  it("extractPrice falls back to original price when sale price is missing", () => {
    const product = createTestProduct({
      pricing: {
        price: undefined,
        original_price: "$49.5",
        currency: "cad",
        availability: "InStock",
      },
    });

    expect(extractPrice(product)).toEqual({ value: "49.50", currency: "CAD" });
  });

  it("extractSalePrice returns null when missing or not cheaper than original", () => {
    const withoutSalePrice = createTestProduct({
      pricing: {
        price: undefined,
        original_price: "$59",
        currency: "usd",
        availability: "InStock",
      },
    });

    const notCheaperSale = createTestProduct({
      pricing: {
        price: "$79",
        original_price: "$59",
        currency: "usd",
        availability: "InStock",
      },
    });

    expect(extractSalePrice(withoutSalePrice)).toBeNull();
    expect(extractSalePrice(notCheaperSale)).toBeNull();
  });

  it("sanitizeDescription collapses whitespace and truncates to the API limit", () => {
    expect(sanitizeDescription("  Hello \n world\t ")).toBe("Hello world");
    expect(sanitizeDescription("a".repeat(6000))).toHaveLength(4999);
  });
});
