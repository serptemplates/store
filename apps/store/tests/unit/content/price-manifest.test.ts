import { describe, expect, it } from "vitest";
import { findPriceEntry } from "@/lib/pricing/price-manifest";
import { getAllProducts } from "@/lib/products/product";
import type { ProductData } from "@/lib/products/product-schema";

describe("price manifest", () => {
  it("keeps stripe price IDs in sync with the manifest", () => {
    const missingManifestEntries: string[] = [];
    const mismatchedSlugs: string[] = [];
    const missingStripeProducts: string[] = [];

    const products = getAllProducts();

    for (const product of products) {
      const stripe = product.payment?.stripe;
      if (!stripe?.price_id) continue;

      const manifestEntry = findPriceEntry(stripe.price_id, undefined);
      if (!manifestEntry) {
        missingManifestEntries.push(`${product.slug}: missing manifest entry for ${stripe.price_id}`);
      } else if (manifestEntry.slug !== product.slug) {
        mismatchedSlugs.push(
          `${product.slug}: manifest entry ${manifestEntry.slug} does not match price_id ${stripe.price_id}`,
        );
      }

      const stripeProductId = stripe.metadata?.stripe_product_id;
      if (typeof stripeProductId !== "string" || stripeProductId.trim().length === 0) {
        missingStripeProducts.push(`${product.slug}: missing stripe.metadata.stripe_product_id`);
      }
    }

    expect(missingManifestEntries).toEqual([]);
    expect(mismatchedSlugs).toEqual([]);
    expect(missingStripeProducts).toEqual([]);
  });
});
