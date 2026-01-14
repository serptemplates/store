import Stripe from "stripe";
import { describe, it, expect } from "vitest";

import { getAllProducts } from "@/lib/products/product";
import { resolveSeoProductName } from "@/lib/products/unofficial-branding";
import { formatTrademarkDisclaimer } from "@/lib/products/trademark";

const stripeSecret = process.env.STRIPE_SECRET_KEY_LIVE ?? process.env.STRIPE_SECRET_KEY;
const API_VERSION: Stripe.LatestApiVersion = "2024-04-10";
const maybeDescribe = stripeSecret ? describe : describe.skip;

const DISCLAIMER_SUFFIX =
  "All trademarks are property of their respective owners and use of them does not imply affiliation or endorsement.";

function fallbackDisclaimer(productName: string, tradeName: string, legalEntity?: string | null): string {
  const trimmedLegal = legalEntity?.trim();
  const legalSegment = trimmedLegal ? `, ${trimmedLegal}` : "";
  return `${productName} is an independent product not affiliated with or endorsed by ${tradeName}${legalSegment} or any subsidiaries or affiliates. ${DISCLAIMER_SUFFIX}`;
}

maybeDescribe(
  "Stripe product copy (live)",
  () => {
    it(
      "keeps (Unofficial) title and trademark disclaimer in sync",
      async () => {
        const products = getAllProducts().filter(
          (product) =>
            product.trademark_metadata?.uses_trademarked_brand
            && product.payment?.stripe?.metadata?.stripe_product_id?.trim(),
        );

        if (products.length === 0) {
          return;
        }

        const stripe = new Stripe(stripeSecret!, { apiVersion: API_VERSION });
        const issues: string[] = [];

        for (const product of products) {
          const productId = product.payment!.stripe!.metadata!.stripe_product_id!.trim();
          const expectedName = resolveSeoProductName(product);
          const expectedDisclaimer =
            formatTrademarkDisclaimer(product) ??
            fallbackDisclaimer(
              product.name?.trim() ?? expectedName,
              product.trademark_metadata?.trade_name ?? product.name ?? expectedName,
              product.trademark_metadata?.legal_entity,
            );

          try {
            const stripeProduct = await stripe.products.retrieve(productId);
            const stripeDescription = stripeProduct.description ?? "";

            if (stripeProduct.name !== expectedName) {
              issues.push(`${product.slug}: Stripe name mismatch (${stripeProduct.name} !== ${expectedName})`);
            }

            if (stripeDescription !== expectedDisclaimer) {
              issues.push(`${product.slug}: Stripe description mismatch`);
            } else if (!stripeDescription.includes(DISCLAIMER_SUFFIX)) {
              issues.push(`${product.slug}: Stripe description missing trademark suffix`);
            }
          } catch (error) {
            const stripeError = error as Stripe.errors.StripeError;
            issues.push(`${product.slug}: failed to retrieve product ${productId} (${stripeError?.message ?? "unknown"})`);
          }
        }

        expect(issues).toEqual([]);
      },
      120_000,
    );
  },
);
