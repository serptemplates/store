import { describe, expect, it } from "vitest";

import { getAllProducts } from "@/lib/products/product";
import { productToHomeTemplate } from "@/lib/products/product-adapter";
import { resolveProductPageUrl } from "@/lib/products/product-urls";
import { getSiteBaseUrl } from "@/lib/urls";

const baseUrl = getSiteBaseUrl();
const siteBaseUrl = `${baseUrl.replace(/\/$/, "")}/`;

const ALLOWED_PREFIXES = [
  siteBaseUrl,
  "https://ghl.serp.co/",
  "https://newsletter.serp.co/",
  "https://serp.ly/",
  "https://buy.stripe.com/",
];

const ALLOWED_EXACT = new Set(["#waitlist"]);

const FALLBACK_PAGE_BASE = siteBaseUrl;

describe("buy button destinations", () => {
  it("ensures each product CTA points to an approved destination", () => {
    const products = getAllProducts();

    const ctaViolations = products
      .map((product) => {
        const template = productToHomeTemplate(product, [], { baseUrl });
        const href = template.ctaHref;

        if (typeof href !== "string") {
          return { slug: product.slug, href: String(href) };
        }

        const isInternalCheckout = href.startsWith("/checkout?product=") || href.startsWith("/checkout/");
        const isAllowed =
          isInternalCheckout
          || ALLOWED_EXACT.has(href)
          || ALLOWED_PREFIXES.some((prefix) => href.startsWith(prefix));

        return isAllowed ? null : { slug: product.slug, href };
      })
      .filter((entry): entry is { slug: string; href: string } => entry !== null);

    expect(ctaViolations).toEqual([]);

    const pageViolations: Array<{ slug: string; field: "apps"; pageUrl: string; expected: string }> = [];

    products.forEach((product) => {
      const expectedApps = `${FALLBACK_PAGE_BASE}${product.slug}`;
      const resolved = resolveProductPageUrl(product, { baseUrl });
      if (resolved !== expectedApps) {
        pageViolations.push({
          slug: product.slug,
          field: "apps",
          pageUrl: resolved ?? "",
          expected: expectedApps,
        });
      }
    });

    expect(pageViolations).toEqual([]);
  });
});
