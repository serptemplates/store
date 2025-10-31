import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";
import { describe, expect, it } from "vitest";
import { getAllProducts } from "@/lib/products/product";
import type { ProductData } from "@/lib/products/product-schema";

type ProductRecord = {
  slug: string;
  liveUrl: string;
  priceCents?: number;
  currency?: string;
};

const ENV_FILENAMES = [".env.local", ".env"] as const;
const ENV_SEARCH_ROOTS = [
  process.cwd(),
  path.resolve(process.cwd(), ".."),
  path.resolve(process.cwd(), "..", ".."),
] as const;

for (const root of ENV_SEARCH_ROOTS) {
  for (const filename of ENV_FILENAMES) {
    dotenv.config({ path: path.join(root, filename), override: false });
  }
}

const STRIPE_API_VERSION: Stripe.StripeConfig["apiVersion"] = "2024-04-10";

function priceLabelToCents(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  return Math.round(numeric * 100);
}

function hasStripePaymentLink(
  link: ProductData["payment_link"],
): link is { live_url: string; test_url?: string | undefined } {
  return Boolean(link && typeof link === "object" && "live_url" in link);
}

async function loadProductRecords(): Promise<ProductRecord[]> {
  const products = getAllProducts();

  return products
    .filter((product) => {
      const link = product.payment_link;
      if (!hasStripePaymentLink(link)) {
        return false;
      }

      const liveUrl = link.live_url;
      if (typeof liveUrl !== "string" || !liveUrl.startsWith("https://buy.stripe.com/")) {
        return false;
      }

      if (product.status && product.status !== "live") {
        return false;
      }

      return true;
    })
    .map((product) => {
      const link = product.payment_link;
      if (!hasStripePaymentLink(link)) {
        throw new Error(`Expected Stripe payment link for ${product.slug}`);
      }
      const liveUrl = link.live_url;
      const priceCents = priceLabelToCents(product.pricing?.price);
      const currency =
        typeof product.pricing?.currency === "string" ? product.pricing!.currency : undefined;

      return {
        slug: product.slug,
        liveUrl: liveUrl,
        priceCents,
        currency,
      };
    });
}

async function mapPaymentLinksByUrl(stripe: Stripe): Promise<Map<string, Stripe.PaymentLink>> {
  const map = new Map<string, Stripe.PaymentLink>();

  let startingAfter: string | undefined;

  do {
    const page = await stripe.paymentLinks.list({
      limit: 100,
      starting_after: startingAfter,
    });

    for (const link of page.data) {
      map.set(link.url, link);
    }

    startingAfter = page.has_more && page.data.length > 0 ? page.data[page.data.length - 1]!.id : undefined;
  } while (startingAfter);

  return map;
}

const stripeSecret = process.env.STRIPE_SECRET_KEY;

const maybeDescribe = stripeSecret ? describe : describe.skip;

maybeDescribe("Stripe live payment links", () => {
  it(
    "ensures every live payment link resolves and matches product pricing",
    async () => {
      const products = await loadProductRecords();
      expect(products.length).toBeGreaterThan(0);

      const stripe = new Stripe(stripeSecret!, { apiVersion: STRIPE_API_VERSION });
      const paymentLinkMap = await mapPaymentLinksByUrl(stripe);

      const issues: string[] = [];
      const validated: Array<{
        slug: string;
        linkId: string;
        unitAmount: number;
        currency: string;
      }> = [];

      for (const product of products) {
        const response = await fetch(product.liveUrl, { redirect: "follow" });
        if (!response.ok) {
          issues.push(`${product.slug}: HTTP ${response.status} from ${product.liveUrl}`);
          continue;
        }

        const link = paymentLinkMap.get(product.liveUrl);
        if (!link) {
          issues.push(`${product.slug}: Stripe payment link not found for ${product.liveUrl}`);
          continue;
        }

        if (!link.active) {
          issues.push(`${product.slug}: Stripe payment link is inactive (${link.id})`);
          continue;
        }

        const lineItems = await stripe.paymentLinks.listLineItems(link.id, { limit: 1 });
        const firstItem = lineItems.data[0];

        if (!firstItem) {
          issues.push(`${product.slug}: Stripe payment link ${link.id} has no line items`);
          continue;
        }

        const unitAmount = firstItem.price?.unit_amount;
        if (typeof unitAmount !== "number") {
          issues.push(`${product.slug}: Stripe price missing unit amount for ${link.id}`);
          continue;
        }

        const expectedAmount = product.priceCents;
        if (expectedAmount !== undefined && unitAmount !== expectedAmount) {
          issues.push(
            `${product.slug}: Stripe unit amount ${unitAmount}¢ does not match product price ${expectedAmount}¢`,
          );
        }

        const stripeCurrency = (firstItem.price?.currency ?? "usd").toUpperCase();
        const expectedCurrency = (product.currency ?? "USD").toUpperCase();

        if (stripeCurrency !== expectedCurrency) {
          issues.push(
            `${product.slug}: Stripe currency ${stripeCurrency} differs from product currency ${expectedCurrency}`,
          );
          continue;
        }

        validated.push({
          slug: product.slug,
          linkId: link.id,
          unitAmount,
          currency: stripeCurrency,
        });
      }

      if (issues.length > 0) {
        expect(issues).toEqual([]);
      }

      console.info(`✅ Validated ${validated.length} live Stripe payment links`);
      console.table(
        validated.map((entry) => ({
          slug: entry.slug,
          link: entry.linkId,
          amount_cents: entry.unitAmount,
          currency: entry.currency,
        })),
      );
    },
    120_000,
  );
});
