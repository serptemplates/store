import { describe, expect, it } from "vitest";

import { getAllProducts } from "@/lib/products/product";
import { productToHomeTemplate } from "@/lib/products/product-adapter";

const ALLOWED_PREFIXES = ["https://store.serp.co/", "https://ghl.serp.co/"];

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

        const isInternalCheckout = href.startsWith("/checkout?product=");
        const isAllowed =
          isInternalCheckout || ALLOWED_PREFIXES.some((prefix) => href.startsWith(prefix));

        return isAllowed ? null : { slug: product.slug, href };
      })
      .filter((entry): entry is { slug: string; href: string } => entry !== null);

    expect(ctaViolations).toEqual([]);

    const successViolations: Array<{ slug: string; successUrl?: string }> = [];

    products.forEach((product) => {
      const buy = product.buy_button_destination;
      const needsFallback =
        typeof buy !== "string" || !buy.trim() || !buy.startsWith("https://ghl.serp.co/");

      if (!needsFallback) {
        return;
      }

      const successUrl = product.success_url;
      if (successUrl !== FALLBACK_SUCCESS_URL) {
        successViolations.push({ slug: product.slug, successUrl });
      }
    });

    expect(successViolations).toEqual([]);

    const cancelViolations: Array<{ slug: string; cancelUrl?: string; expected: string }> = [];

    products.forEach((product) => {
      const buy = product.buy_button_destination;
      const needsFallback =
        typeof buy !== "string" || !buy.trim() || !buy.startsWith("https://ghl.serp.co/");

      if (!needsFallback) {
        return;
      }

      const cancelUrl = product.cancel_url;
      const expected = `${FALLBACK_CANCEL_BASE}${product.slug}`;
      if (cancelUrl !== expected) {
        cancelViolations.push({ slug: product.slug, cancelUrl, expected });
      }
    });

    expect(cancelViolations).toEqual([]);

    const pageViolations: Array<{ slug: string; field: "store" | "apps"; pageUrl: string; expected: string }> = [];

    products.forEach((product) => {
      const expectedStore = `${STORE_PAGE_BASE}${product.slug}`;
      if (product.store_serp_co_product_page_url !== expectedStore) {
        pageViolations.push({
          slug: product.slug,
          field: "store",
          pageUrl: product.store_serp_co_product_page_url ?? "",
          expected: expectedStore,
        });
      }

      const expectedApps = `${FALLBACK_PAGE_BASE}${product.slug}`;
      if (product.apps_serp_co_product_page_url !== expectedApps) {
        pageViolations.push({
          slug: product.slug,
          field: "apps",
          pageUrl: product.apps_serp_co_product_page_url ?? "",
          expected: expectedApps,
        });
      }
    });

    expect(pageViolations).toEqual([]);
  });
});
