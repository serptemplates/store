import { describe, expect, it } from "vitest";

import { serializeMerchantProductsToCsv, serializeMerchantProductsToXml } from "@/lib/google-merchant/feed-formatter";
import { buildMerchantProduct } from "@/lib/google-merchant/merchant-product";

import { createTestProduct } from "./test-utils";

function createMerchantProduct() {
  const product = createTestProduct();
  return buildMerchantProduct(product, {
    country: "US",
    language: "en",
    siteUrl: "https://apps.serp.co",
    appsUrl: "https://apps.serp.co",
  });
}

describe("feed-formatter", () => {
  it("serializes products to CSV with expected headers", () => {
    const merchantProduct = createMerchantProduct();
    const csv = serializeMerchantProductsToCsv([merchantProduct]);

    const [headerLine, row] = csv.split("\n");
    expect(headerLine.split(",")).toEqual([
      "id",
      "title",
      "description",
      "link",
      "mobile_link",
      "image_link",
      "additional_image_link",
      "availability",
      "price",
      "sale_price",
      "content_language",
      "target_country",
      "brand",
      "condition",
      "google_product_category",
      "product_type",
      "identifier_exists",
      "shipping",
      "adult",
      "mpn",
      "custom_label_0",
    ]);
    expect(row).toContain('"demo-product"');
    expect(row).toContain('"Demo Product"');
    expect(row).toContain('"SERP Apps"');
    expect(row).toContain('"FALSE"'); // identifier_exists
  });

  it("serializes products to XML with expected tags", () => {
    const merchantProduct = createMerchantProduct();
    const xml = serializeMerchantProductsToXml([merchantProduct], {
      title: "SERP Apps",
      link: "https://apps.serp.co",
    });

    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toContain("<title>SERP Apps</title>");
    expect(xml).toContain("<g:id>demo-product</g:id>");
    expect(xml).toContain("<g:price>0.00 USD</g:price>");
    expect(xml).toContain("<g:shipping>");
    expect(xml).toContain("<g:identifier_exists>FALSE</g:identifier_exists>");
  });
});
