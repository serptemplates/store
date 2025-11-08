import Stripe from "stripe";
import { describe, it, expect } from "vitest";
import { getAllProducts } from "@/lib/products/product";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const requireCrossSell = process.env.STRIPE_REQUIRE_CROSS_SELL === "1";

// Use the same experimental API version as update-stripe-cross-sells.ts for cross_sells field
const API_VERSION = "2025-06-30.basil" as unknown as Stripe.LatestApiVersion;

const maybeDescribe = stripeSecret ? describe : describe.skip;

maybeDescribe("Stripe cross-sells configuration (live)", () => {
  it(
    "verifies Stripe products expose cross_sells when configured",
    async () => {
      const products = getAllProducts().filter((p) => p.status === "live" && !!p.stripe?.metadata?.stripe_product_id);
      if (products.length === 0) {
        return; // nothing to check
      }

      const stripe = new Stripe(stripeSecret!, { apiVersion: API_VERSION });

      const issues: string[] = [];
      let checked = 0;
      for (const p of products) {
        const productId = p.stripe!.metadata!.stripe_product_id!;
        const stripeProduct = await stripe.products.retrieve(productId);

        const anyProduct = stripeProduct as unknown as { cross_sells?: unknown };
        if (Array.isArray(anyProduct.cross_sells)) {
          checked += 1;
          if (requireCrossSell && anyProduct.cross_sells.length === 0) {
            issues.push(`${p.slug}: cross_sells configured but empty for ${productId}`);
          }
        }
      }

      if (requireCrossSell) {
        // In strict mode, there must be at least one product checked and no issues.
        expect(checked).toBeGreaterThan(0);
        expect(issues).toEqual([]);
      }
    },
    90_000,
  );
});

