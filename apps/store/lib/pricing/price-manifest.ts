import priceManifest from "@/data/prices/manifest.json";
import type { PaymentProviderId } from "@/lib/products/payment";
import type { ProductData } from "@/lib/products/product-schema";

type ProviderEnvironmentDetails = {
  listing_id?: string;
  plan_id?: string;
  offer_id?: string;
  product_id?: string;
  price_id?: string;
  variant_id?: string;
  checkout_url?: string;
  campaign_id?: string;
  store_id?: string;
};

type ProviderConfig = {
  api_key_alias?: string;
  webhook_secret_alias?: string;
  metadata?: Record<string, string>;
  live?: ProviderEnvironmentDetails;
  test?: ProviderEnvironmentDetails;
};

type RawManifestEntry = {
  slug: string;
  provider: PaymentProviderId | string;
  account?: string;
  mode?: "payment" | "subscription";
  currency: string;
  unit_amount: number;
  compare_at_amount?: number;
  stripe?: {
    live_price_id?: string;
    test_price_id?: string;
  };
  whop?: ProviderConfig;
  easy_pay_direct?: ProviderConfig;
  lemonsqueezy?: ProviderConfig;
};

type RawManifest = Record<string, RawManifestEntry>;

const manifest = priceManifest as RawManifest;

type IndexedManifestEntry = {
  priceId: string;
  entry: RawManifestEntry;
};

const priceIndex = new Map<string, IndexedManifestEntry>();
const slugIndex = new Map<string, RawManifestEntry>();

for (const [slug, entry] of Object.entries(manifest)) {
  if (!entry) continue;
  slugIndex.set(slug, entry);

  const liveId = entry.stripe?.live_price_id;
  const testId = entry.stripe?.test_price_id;

  if (liveId) {
    priceIndex.set(liveId, { priceId: liveId, entry });
  }
  if (testId) {
    priceIndex.set(testId, { priceId: testId, entry });
  }
}

export type PriceManifestEntry = {
  id: string;
  slug: string;
  provider: PaymentProviderId | string;
  account?: string;
  unitAmount: number;
  currency: string;
  compareAtAmount?: number;
  stripe?: RawManifestEntry["stripe"];
  whop?: ProviderConfig;
  easy_pay_direct?: ProviderConfig;
  lemonsqueezy?: ProviderConfig;
};

function normaliseCurrency(value?: string): string {
  return (value ?? "USD").toUpperCase();
}

function formatEntry(raw: RawManifestEntry, id: string): PriceManifestEntry {
  return {
    id,
    slug: raw.slug,
    provider: raw.provider,
    account: raw.account,
    unitAmount: raw.unit_amount,
    currency: normaliseCurrency(raw.currency),
    compareAtAmount: raw.compare_at_amount,
    stripe: raw.stripe,
    whop: raw.whop,
    easy_pay_direct: raw.easy_pay_direct,
    lemonsqueezy: raw.lemonsqueezy,
  };
}

export function findPriceEntry(
  ...candidateIds: Array<string | null | undefined>
): PriceManifestEntry | undefined {
  for (const candidate of candidateIds) {
    if (!candidate) {
      continue;
    }
    const indexed = priceIndex.get(candidate);
    if (!indexed) {
      continue;
    }

    const raw = indexed.entry;
    return formatEntry(raw, candidate);
  }

  return undefined;
}

export function findManifestEntryBySlug(slug: string): PriceManifestEntry | undefined {
  const raw = slugIndex.get(slug);
  if (!raw) {
    return undefined;
  }

  const fallbackId =
    raw.stripe?.live_price_id ??
    raw.stripe?.test_price_id ??
    raw.whop?.live?.listing_id ??
    raw.whop?.test?.listing_id ??
    raw.slug;

  return formatEntry(raw, fallbackId ?? raw.slug);
}

export function resolveProductCurrency(product: ProductData, fallback = "USD"): string {
  const entry =
    findPriceEntry(product.payment?.stripe?.price_id, product.payment?.stripe?.test_price_id) ??
    findManifestEntryBySlug(product.slug);
  return entry?.currency ?? normaliseCurrency(fallback);
}

export function formatAmountFromCents(
  unitAmount: number,
  currency: string,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normaliseCurrency(currency),
  }).format(unitAmount / 100);
}

export function formatEntryAmount(entry: PriceManifestEntry): string {
  return formatAmountFromCents(entry.unitAmount, entry.currency);
}
