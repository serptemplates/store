import { describe, expect, it } from "vitest";

import { getAllProducts } from "@/lib/products/product";
import { resolveSeoProductName } from "@/lib/products/unofficial-branding";
import { formatTrademarkDisclaimer } from "@/lib/products/trademark";

const stripeTrademarkedProducts = getAllProducts().filter(
  (product) => product.trademark_metadata?.uses_trademarked_brand && product.stripe?.metadata?.stripe_product_id,
);

describe("stripe product copy", () => {
  it("appends (Unofficial) to every trademarked Stripe product name", () => {
    expect(stripeTrademarkedProducts.length, "no trademarked Stripe products found").toBeGreaterThan(0);

    for (const product of stripeTrademarkedProducts) {
      const resolved = resolveSeoProductName(product);
      const trimmedName = product.name.trim();

      expect(resolved, `${product.slug}: stripe name must include (Unofficial)`).toMatch(/\(Unofficial\)/);
      expect(
        resolved.startsWith(`${trimmedName} (Unofficial)`),
        `${product.slug}: stripe name must begin with "${trimmedName} (Unofficial)"`,
      ).toBe(true);
    }
  });

  it("includes the trademark disclaimer language in the description", () => {
    const REQUIRED_SUFFIX =
      "All trademarks are property of their respective owners and use of them does not imply affiliation or endorsement.";

    for (const product of stripeTrademarkedProducts) {
      const disclaimer = formatTrademarkDisclaimer(product);
      expect(disclaimer, `${product.slug}: missing trademark disclaimer`).toBeTruthy();

      expect(
        disclaimer?.startsWith(`${product.name} is an independent product not affiliated with or endorsed by`),
        `${product.slug}: disclaimer must start with the independence statement`,
      ).toBe(true);

      expect(
        disclaimer?.includes(REQUIRED_SUFFIX),
        `${product.slug}: disclaimer must include the "${REQUIRED_SUFFIX}" suffix`,
      ).toBe(true);
    }
  });
});
