import { getOrderBumpDefinition } from "./order-bump-definitions";
import { findPriceEntry, formatAmountFromCents } from "@/lib/pricing/price-manifest";
import type { ProductData } from "./product-schema";

export interface ResolvedOrderBump {
  id: string;
  productSlug: string;
  title: string;
  description?: string;
  price?: string;
  priceNumber?: number | null;
  priceDisplay?: string;
  originalPrice?: string;
  originalPriceNumber?: number | null;
  originalPriceDisplay?: string;
  points: string[];
  defaultSelected: boolean;
  stripePriceId: string;
  stripeTestPriceId?: string;
  terms?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function parsePrice(input?: string | null): { value: number | null; display?: string } {
  if (!input) {
    return { value: null };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { value: null };
  }

  const numeric = Number.parseFloat(trimmed.replace(/[^0-9.\-]/g, ""));
  if (Number.isFinite(numeric)) {
    return { value: numeric, display: trimmed };
  }

  return { value: null, display: trimmed };
}

function mergeArrays(...candidates: Array<string[] | undefined>): string[] {
  for (const list of candidates) {
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
  }
  return [];
}

export function resolveOrderBump(product: ProductData): ResolvedOrderBump | undefined {
  const config = product.order_bump;
  if (!config || config.enabled === false) {
    return undefined;
  }

  const slugCandidate =
    typeof config.slug === "string" && config.slug.trim().length > 0
      ? config.slug.trim()
      : typeof config.product_slug === "string" && config.product_slug.trim().length > 0
      ? config.product_slug.trim()
      : undefined;
  const orderBumpDefinition = slugCandidate ? getOrderBumpDefinition(slugCandidate) : undefined;

  const hasInlineDetails =
    Boolean(
      config.title ??
      config.description ??
      config.price ??
      config.features?.length ??
      config.stripe?.price_id ??
      config.stripe?.test_price_id,
  ) ||
  Boolean(config.stripe?.price_id);

  if (!orderBumpDefinition && slugCandidate && !hasInlineDetails) {
    throw new Error(
      `Order bump "${slugCandidate}" does not have a matching definition under data/order-bumps and no inline overrides are provided.`,
    );
  }

  if (orderBumpDefinition?.enabled === false && config.enabled !== true) {
    return undefined;
  }

  const resolvedId = slugCandidate ?? orderBumpDefinition?.slug ?? product.slug;
  if (!resolvedId) {
    throw new Error("Order bump is missing an identifier.");
  }

  const title =
    config.title ?? orderBumpDefinition?.title ?? resolvedId;
  const description = config.description ?? orderBumpDefinition?.description;

  const priceManifestEntry = findPriceEntry(
    config.stripe?.price_id ?? orderBumpDefinition?.stripe?.price_id,
    config.stripe?.test_price_id ?? orderBumpDefinition?.stripe?.test_price_id,
  );

  const priceInfo = priceManifestEntry
    ? {
        value: priceManifestEntry.unitAmount / 100,
        display: formatAmountFromCents(priceManifestEntry.unitAmount, priceManifestEntry.currency),
      }
    : parsePrice(config.price ?? orderBumpDefinition?.price);

  const originalPriceInfo = parsePrice(undefined);

  const features = mergeArrays(
    config.features,
    orderBumpDefinition?.features
  );

  const points = features;

  const stripePriceId =
    config.stripe?.price_id ??
    orderBumpDefinition?.stripe?.price_id;

  if (!stripePriceId) {
    throw new Error(
      `Order bump "${resolvedId}" is missing stripe.price_id; add it to data/order-bumps/${resolvedId}.yaml or inline in the product definition.`,
    );
  }

  const stripeTestPriceId =
    config.stripe?.test_price_id ??
    orderBumpDefinition?.stripe?.test_price_id;

  const defaultSelected = Boolean(config.default_selected ?? orderBumpDefinition?.default_selected);
  const productSlug = config.product_slug ?? orderBumpDefinition?.product_slug ?? product.slug;

  return {
    id: resolvedId,
    productSlug,
    title,
    description,
    price: priceInfo.display ?? (priceInfo.value != null ? formatCurrency(priceInfo.value) : undefined),
    priceNumber: priceInfo.value,
    priceDisplay: priceInfo.display ?? (priceInfo.value != null ? formatCurrency(priceInfo.value) : undefined),
    originalPrice: originalPriceInfo.display,
    originalPriceNumber: originalPriceInfo.value,
    originalPriceDisplay:
      originalPriceInfo.display ?? (originalPriceInfo.value != null ? formatCurrency(originalPriceInfo.value) : undefined),
    points,
    defaultSelected,
    stripePriceId,
    stripeTestPriceId,
  };
}
