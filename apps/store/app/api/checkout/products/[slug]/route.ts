import { NextResponse } from "next/server";

import { resolveProductPrice } from "@/lib/pricing/price-manifest";
import { getProductData } from "@/lib/products/product";

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

  const priceDetails = resolveProductPrice(product);
  const priceNumber = priceDetails.amount ?? 0;
  const priceDisplay = priceDetails.display ?? "$0.00";
  const originalPriceNumber = priceDetails.compareAtAmount;
  const originalPriceDisplay = priceDetails.compareAtDisplay;
  const currency = priceDetails.currency;

  return NextResponse.json({
    slug: product.slug,
    name: product.name,
    title: product.name ?? product.slug,
    price: priceNumber ?? 0,
    priceDisplay,
    originalPrice: originalPriceNumber,
    originalPriceDisplay,
    currency,
  });
}
