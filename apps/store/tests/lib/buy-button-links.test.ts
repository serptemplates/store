import { describe, expect, it } from "vitest";

import { getAllProducts } from "@/lib/product";
import { productToHomeTemplate } from "@/lib/product-adapter";

const ALLOWED_PREFIXES = [
  "https://store.serp.co/",
  "https://ghl.serp.co/",
];

describe("buy button destinations", () => {
  it("ensures each product CTA points to an approved destination", () => {
    const products = getAllProducts();

    const violations = products
      .map((product) => {
        const template = productToHomeTemplate(product);
        const href = template.ctaHref;

        if (typeof href !== "string") {
          return { slug: product.slug, href: String(href) };
        }

        const isAllowed = ALLOWED_PREFIXES.some((prefix) => href.startsWith(prefix));

        return isAllowed ? null : { slug: product.slug, href };
      })
      .filter((entry): entry is { slug: string; href: string } => entry !== null);

    expect(violations).toEqual([]);
  });
});
