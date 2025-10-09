"use client";

import type { ProductData } from "@/lib/products/product-schema";
import { captureEvent } from "./posthog";

type ProductEventContext = {
  placement?: "pricing" | "sticky" | "sticky_bar" | "hero" | "unknown";
  destination?: "checkout" | "external";
  affiliateId?: string | null;
};

function buildProductProperties(product: ProductData) {
  const priceString = product.pricing?.price ?? null;
  const priceValue = priceString ? Number(priceString.replace(/[^0-9.]/g, "")) : null;

  return {
    productSlug: product.slug,
    productName: product.name,
    productPlatform: product.platform ?? null,
    productCategories: product.categories ?? [],
    productStatus: product.status ?? null,
    productPriceDisplay: priceString,
    productPriceValue: Number.isFinite(priceValue) ? priceValue : null,
    productSku: product.sku ?? null,
    productBrand: product.brand ?? null,
  };
}

export function trackProductPageView(product: ProductData, options?: { affiliateId?: string | null }) {
  captureEvent("product_viewed", {
    ...buildProductProperties(product),
    affiliateId: options?.affiliateId ?? null,
  });
}

export function trackProductCheckoutClick(
  product: ProductData,
  context: ProductEventContext,
) {
  captureEvent("product_checkout_clicked", {
    ...buildProductProperties(product),
    placement: context.placement ?? "unknown",
    destination: context.destination ?? "checkout",
    affiliateId: context.affiliateId ?? null,
  });
}

export function trackCheckoutSuccessBanner(product: ProductData, options?: { affiliateId?: string | null }) {
  captureEvent("product_checkout_success_banner_viewed", {
    ...buildProductProperties(product),
    affiliateId: options?.affiliateId ?? null,
  });
}
