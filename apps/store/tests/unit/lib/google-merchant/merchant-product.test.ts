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
      siteUrl: "https://apps.serp.co",
      appsUrl: "https://apps.serp.co",
    });

    expect(result.offerId).toBe("demo-product");
    expect(result.link).toBe("https://apps.serp.co/demo-product");
    expect(result.mobileLink).toBe("https://apps.serp.co/demo-product");
    expect(result.description).toBe("Turn chaos into clarity.");
    expect(result.price).toEqual({ value: "19.00", currency: "USD" });
    expect(result.salePrice).toBeUndefined();
    expect(result.availability).toBe("in stock");
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

  it("extractPrice falls back to the pricing price when no manifest entry exists", () => {
    const product = createTestProduct({
      pricing: {
        price: "$49.5",
      },
    });

    expect(extractPrice(product)).toEqual({ value: "49.50", currency: "USD" });
  });

  it("extractSalePrice returns null when there is no compare-at value", () => {
    const notCheaperSale = createTestProduct({
      pricing: {
        price: "$79",
      },
    });

    expect(extractSalePrice(notCheaperSale)).toBeNull();
  });

  it("sanitizeDescription collapses whitespace and truncates to the API limit", () => {
    expect(sanitizeDescription("  Hello \n world\t ")).toBe("Hello world");
    expect(sanitizeDescription("a".repeat(6000))).toHaveLength(4999);
  });
});
