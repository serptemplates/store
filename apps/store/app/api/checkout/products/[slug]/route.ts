import { NextResponse } from "next/server";

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

function normalizePoints(list?: unknown): string[] {
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((entry) => {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        return trimmed.length > 0 ? trimmed : null;
      }
      return null;
    })
    .filter((entry): entry is string => Boolean(entry));
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

  const priceNumber = parsePrice(product.pricing?.price);
  const originalPriceNumber = parsePrice(product.pricing?.original_price);

  const orderBumpConfig = product.order_bump?.enabled === false ? undefined : product.order_bump;
  const orderBump =
    orderBumpConfig && orderBumpConfig.stripe?.price_id
      ? (() => {
          const bumpPriceNumber = parsePrice(orderBumpConfig.price) ?? 0;
          const bumpOriginalNumber = parsePrice(orderBumpConfig.original_price);
          const primaryPoints =
            orderBumpConfig.benefits && orderBumpConfig.benefits.length > 0
              ? orderBumpConfig.benefits
              : orderBumpConfig.features;

          return {
            id: orderBumpConfig.id,
            title: orderBumpConfig.title,
            subtitle: orderBumpConfig.subtitle ?? undefined,
            description: orderBumpConfig.description ?? undefined,
            price: bumpPriceNumber,
            priceDisplay: formatPriceDisplay(orderBumpConfig.price, bumpPriceNumber),
            originalPrice: bumpOriginalNumber,
            originalPriceDisplay:
              bumpOriginalNumber !== undefined
                ? formatPriceDisplay(orderBumpConfig.original_price, bumpOriginalNumber)
                : undefined,
            note: orderBumpConfig.note ?? undefined,
            badge: orderBumpConfig.badge ?? undefined,
            terms: orderBumpConfig.terms ?? undefined,
            defaultSelected: Boolean(orderBumpConfig.default_selected),
            points: normalizePoints(primaryPoints),
            stripePriceId: orderBumpConfig.stripe.price_id,
            stripeTestPriceId: orderBumpConfig.stripe.test_price_id ?? undefined,
          };
        })()
      : undefined;

  return NextResponse.json({
    slug: product.slug,
    name: product.name,
    title: product.name ?? product.slug,
    price: priceNumber ?? 0,
    priceDisplay: formatPriceDisplay(product.pricing?.price, priceNumber ?? 0),
    originalPrice: originalPriceNumber,
    originalPriceDisplay:
      originalPriceNumber !== undefined
        ? formatPriceDisplay(product.pricing?.original_price, originalPriceNumber)
        : undefined,
    currency: product.pricing?.currency ?? "USD",
    note: product.pricing?.note ?? undefined,
    orderBump,
  });
}
