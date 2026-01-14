import { NextResponse } from "next/server";

import { findPriceEntry, findManifestEntryBySlug, formatAmountFromCents } from "@/lib/pricing/price-manifest";
import { getProductData } from "@/lib/products/product";

function parsePrice(value?: string | null): number | undefined {
  if (!value) return undefined;
  const sanitized = value.replace(/[^0-9.]/g, "");
  if (!sanitized) return undefined;
  const numeric = Number.parseFloat(sanitized);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return Number.parseFloat(numeric.toFixed(2));
}

function formatPriceDisplay(value?: string | null, fallback?: number): string {
  if (value && value.trim().length > 0) {
    return value.trim();
  }
  if (fallback !== undefined && Number.isFinite(fallback)) {
    return `$${fallback.toFixed(2)}`;
  }
  return "$0.00";
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug?.trim();

  if (!slug) {
    return NextResponse.json({ error: "Missing product slug" }, { status: 400 });
  }

  let product;
  try {
    product = getProductData(slug);
  } catch (error) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  let priceEntry = findPriceEntry(
    product.payment?.stripe?.price_id,
    product.payment?.stripe?.test_price_id,
  );
  if (!priceEntry) {
    priceEntry = findManifestEntryBySlug(product.slug);
  }
  const priceNumber = priceEntry ? priceEntry.unitAmount / 100 : parsePrice(product.pricing?.price);
  const priceDisplay = priceEntry
    ? formatAmountFromCents(priceEntry.unitAmount, priceEntry.currency)
    : formatPriceDisplay(product.pricing?.price, priceNumber ?? 0);
  const originalPriceNumber = priceEntry?.compareAtAmount != null
    ? priceEntry.compareAtAmount / 100
    : parsePrice(product.pricing?.original_price);
  const originalPriceDisplay = originalPriceNumber !== undefined && originalPriceNumber !== null
    ? priceEntry?.compareAtAmount != null
      ? formatAmountFromCents(priceEntry.compareAtAmount, priceEntry.currency)
      : formatPriceDisplay(product.pricing?.original_price, originalPriceNumber)
    : undefined;
  const currency = priceEntry?.currency ?? product.pricing?.currency ?? "USD";

  return NextResponse.json({
    slug: product.slug,
    name: product.name,
    title: product.name ?? product.slug,
    price: priceNumber ?? 0,
    priceDisplay,
    originalPrice: originalPriceNumber,
    originalPriceDisplay,
    currency,
    note: product.pricing?.note ?? undefined,
  });
}
