import { promises as fs } from "fs";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

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

async function loadProductRecords(): Promise<ProductRecord[]> {
  const productsDir = path.resolve(process.cwd(), "data/products");
  const entries = await fs.readdir(productsDir);

  const records: ProductRecord[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".yaml")) {
      continue;
    }

    const raw = await fs.readFile(path.join(productsDir, entry), "utf8");
    const data = parse(raw) as Record<string, unknown> | null;
    if (!data || typeof data !== "object") {
      continue;
    }

    const record = data as Record<string, unknown>;

    const paymentLink = record["payment_link"] as { live_url?: unknown } | undefined;
    const liveUrl = paymentLink?.live_url;
    if (typeof liveUrl !== "string" || !liveUrl.startsWith("https://buy.stripe.com/")) {
      continue;
    }

    const status = record["status"];
    if (typeof status === "string" && status !== "live" && status !== "beta") {
      continue;
    }

    const pricing = record["pricing"] as { price?: unknown; currency?: unknown } | undefined;
    const priceCents = priceLabelToCents(pricing?.price);

    records.push({
      slug: typeof record["slug"] === "string" ? (record["slug"] as string) : entry.replace(/\.yaml$/, ""),
      liveUrl,
      priceCents,
      currency: typeof pricing?.currency === "string" ? pricing.currency : undefined,
    });
  }

  return records;
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
