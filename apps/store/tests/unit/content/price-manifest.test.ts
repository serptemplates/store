import { describe, expect, it } from "vitest";
import { findPriceEntry, formatAmountFromCents } from "@/lib/pricing/price-manifest";
import { getAllProducts } from "@/lib/products/product";
import type { ProductData } from "@/lib/products/product-schema";

function parsePrice(value?: string | null): number | null {
  if (!value) return null;
  const match = value.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getStripePaymentLink(
  product: ProductData,
): { live_url: string; test_url?: string | undefined } | null {
  const link = product.payment_link;
  if (!link || typeof link !== "object") {
    return null;
  }
  if ("live_url" in link) {
    return link;
  }
  return null;
}

function usesInternalCheckout(product: ProductData): boolean {
  const href = product.pricing?.cta_href;
  return (
    typeof href === "string" &&
    (href.startsWith("/checkout/") || href.startsWith("https://apps.serp.co/checkout/"))
  );
}

describe("price manifest", () => {
  it("keeps manifest amounts and payment link metadata in sync with product copy", () => {
    const mismatches: string[] = [];
    const missingPaymentLinks: string[] = [];
    const missingStripeProducts: string[] = [];

    const products = getAllProducts();

    for (const product of products) {
      const stripe = product.stripe;
      if (!stripe?.price_id) continue;

      const manifestEntry = findPriceEntry(stripe.price_id, undefined);
      if (!manifestEntry) continue;

      const declaredPrice = parsePrice(product.pricing?.price ?? null);
      if (declaredPrice == null) continue;

      const manifestPrice = manifestEntry.unitAmount / 100;
      if (Math.abs(manifestPrice - declaredPrice) > 0.005) {
        mismatches.push(
          `${product.slug}: Stripe price ${formatAmountFromCents(manifestEntry.unitAmount, manifestEntry.currency)} does not match declared price ${product.pricing?.price ?? declaredPrice}`,
        );
      }

      // If the product uses internal checkout (/checkout/:slug), a Payment Link is not required
      if (!usesInternalCheckout(product)) {
        const paymentLink = getStripePaymentLink(product);
        const liveUrl = typeof paymentLink?.live_url === "string" ? paymentLink.live_url.trim() : "";
        if (!liveUrl.startsWith("https://buy.stripe.com/")) {
          missingPaymentLinks.push(`${product.slug}: missing Stripe Payment Link live_url`);
        }
      }

      const stripeProductId = stripe.metadata?.stripe_product_id;
      if (typeof stripeProductId !== "string" || stripeProductId.trim().length === 0) {
        missingStripeProducts.push(`${product.slug}: missing stripe.metadata.stripe_product_id`);
      }
    }

    expect(mismatches).toEqual([]);
    expect(missingPaymentLinks).toEqual([]);
    expect(missingStripeProducts).toEqual([]);
  });
});
