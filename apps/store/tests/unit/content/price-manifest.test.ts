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

describe("price manifest", () => {
  it("keeps manifest amounts in sync with product copy", () => {
    const mismatches: string[] = [];
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

      const stripeProductId = stripe.metadata?.stripe_product_id;
      if (typeof stripeProductId !== "string" || stripeProductId.trim().length === 0) {
        missingStripeProducts.push(`${product.slug}: missing stripe.metadata.stripe_product_id`);
      }
    }

    expect(mismatches).toEqual([]);
    expect(missingStripeProducts).toEqual([]);
  });
});
