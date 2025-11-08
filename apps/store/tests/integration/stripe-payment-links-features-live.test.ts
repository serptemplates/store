import Stripe from "stripe";
import { describe, it, expect } from "vitest";
import { getAllProducts } from "@/lib/products/product";
import type { ProductData } from "@/lib/products/product-schema";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const apiVersion: Stripe.StripeConfig["apiVersion"] = "2024-04-10";

function hasLivePaymentLinkRecord(
  p: ProductData,
): p is ProductData & { payment_link: { live_url: string; test_url?: string } } {
  const link = p.payment_link as unknown;
  return Boolean(
    link && typeof link === "object" && "live_url" in (link as Record<string, unknown>) &&
    typeof (link as { live_url?: unknown }).live_url === "string" &&
    ((link as { live_url: string }).live_url).startsWith("https://buy.stripe.com/")
  );
}

const maybeDescribe = stripeSecret ? describe : describe.skip;

maybeDescribe("Stripe payment link features (live)", () => {
  it("allows promotion codes for all live payment links", async () => {
    const stripe = new Stripe(stripeSecret!, { apiVersion });
    const products = getAllProducts()
      .filter(hasLivePaymentLinkRecord)
      .filter((p) => p.status === "live");

    /** Map url -> link for quick lookup */
    const linkMap = new Map<string, Stripe.PaymentLink>();
    let startingAfter: string | undefined;
    do {
      const page = await stripe.paymentLinks.list({ limit: 100, starting_after: startingAfter });
      for (const link of page.data) linkMap.set(link.url, link);
      startingAfter = page.has_more && page.data.length > 0 ? page.data[page.data.length - 1]!.id : undefined;
    } while (startingAfter);

    const issues: string[] = [];
    for (const product of products) {
      const link = linkMap.get(product.payment_link.live_url);
      if (!link) {
        issues.push(`${product.slug}: live payment link not found in Stripe (${product.payment_link.live_url})`);
        continue;
      }
      if (link.allow_promotion_codes !== true) {
        issues.push(`${product.slug}: allow_promotion_codes is not enabled on ${link.id}`);
      }
    }

    expect(issues).toEqual([]);
  }, 60_000);
});
