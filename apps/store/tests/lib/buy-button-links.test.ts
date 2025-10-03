import { describe, expect, it } from "vitest";

import { getAllProducts } from "@/lib/product";
import { productToHomeTemplate } from "@/lib/product-adapter";

const ALLOWED_PREFIXES = [
  "https://store.serp.co/",
  "https://ghl.serp.co/",
];

const FALLBACK_SUCCESS_URL = "https://apps.serp.co/checkout/success";
const FALLBACK_CANCEL_BASE = "https://apps.serp.co/checkout?product=";
const FALLBACK_PAGE_BASE = "https://apps.serp.co/";
const STORE_PAGE_BASE = "https://store.serp.co/products/";

describe("buy button destinations", () => {
  it("ensures each product CTA points to an approved destination", () => {
    const products = getAllProducts();

    const ctaViolations = products
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

    expect(ctaViolations).toEqual([]);

    const successViolations = products
      .map((product) => {
        const buy = product.buy_button_destination;
        const needsFallback =
          typeof buy !== "string" || !buy.trim() || !buy.startsWith("https://ghl.serp.co/");

        if (!needsFallback) {
          return null;
        }

        const successUrl = product.stripe?.success_url;
        return successUrl === FALLBACK_SUCCESS_URL
          ? null
          : { slug: product.slug, successUrl };
      })
      .filter((entry): entry is { slug: string; successUrl: string | undefined } => entry !== null);

    expect(successViolations).toEqual([]);

    const cancelViolations = products
      .map((product) => {
        const buy = product.buy_button_destination;
        const needsFallback =
          typeof buy !== "string" || !buy.trim() || !buy.startsWith("https://ghl.serp.co/");

        if (!needsFallback) {
          return null;
        }

        const cancelUrl = product.stripe?.cancel_url;
        const expected = `${FALLBACK_CANCEL_BASE}${product.slug}`;
        return cancelUrl === expected ? null : { slug: product.slug, cancelUrl, expected };
      })
      .filter(
        (entry): entry is { slug: string; cancelUrl: string | undefined; expected: string } =>
          entry !== null,
      );

    expect(cancelViolations).toEqual([]);

    const pageViolations: Array<{ slug: string; pageUrl: string; expected: string }> = [];

    products.forEach((product) => {
      const buy = product.buy_button_destination;
      const pageUrl = product.product_page_url ?? "";

      if (typeof buy === "string" && buy.startsWith("https://ghl.serp.co/")) {
        const expected = `${STORE_PAGE_BASE}${product.slug}`;
        if (pageUrl !== expected) {
          pageViolations.push({ slug: product.slug, pageUrl, expected });
        }
        return;
      }

      const expected = `${FALLBACK_PAGE_BASE}${product.slug}`;
      if (pageUrl !== expected) {
        pageViolations.push({ slug: product.slug, pageUrl, expected });
      }
    });

    expect(pageViolations).toEqual([]);
  });
});
