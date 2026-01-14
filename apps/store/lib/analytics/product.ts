"use client";

import type { ProductData } from "@/lib/products/product-schema";
import { resolveProductCurrency, resolveProductPrice } from "@/lib/pricing/price-manifest";
import { captureEvent } from "./posthog";
import { pushSelectItemEvent, pushViewItemEvent, type EcommerceItem } from "./gtm";

type ProductEventContext = {
  placement?: "pricing" | "sticky" | "sticky_bar" | "hero" | "unknown";
  destination?: "checkout" | "external" | "waitlist";
  affiliateId?: string | null;
};

const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_GA_CURRENCY ?? "USD";

function getEcommerceItem(product: ProductData, priceValue: number | null): EcommerceItem {
  return {
    item_id: product.slug,
    item_name: product.name,
    item_category: product.categories?.[0],
    item_category2: product.categories?.[1],
    price: priceValue ?? undefined,
    quantity: 1,
  };
}

function buildProductProperties(product: ProductData) {
  const priceDetails = resolveProductPrice(product, DEFAULT_CURRENCY);
  const priceValue = priceDetails.amount ?? null;

  return {
    productSlug: product.slug,
    productName: product.name,
    productPlatform: product.platform ?? null,
    productCategories: product.categories ?? [],
    productStatus: product.status ?? null,
    productPriceDisplay: priceDetails.display ?? null,
    productPriceValue: priceValue,
    productSku: product.sku ?? null,
    productBrand: product.brand ?? null,
    item: getEcommerceItem(product, priceValue),
    currency: resolveProductCurrency(product, DEFAULT_CURRENCY),
  };
}

export function trackProductPageView(product: ProductData, options?: { affiliateId?: string | null }) {
  const productProps = buildProductProperties(product);

  captureEvent("product_viewed", {
    ...productProps,
    affiliateId: options?.affiliateId ?? null,
  });

  pushViewItemEvent({
    currency: productProps.currency,
    value: productProps.productPriceValue ?? undefined,
    items: [productProps.item],
  });
}

export function trackProductCheckoutClick(
  product: ProductData,
  context: ProductEventContext,
) {
  const productProps = buildProductProperties(product);

  captureEvent("product_checkout_clicked", {
    ...productProps,
    placement: context.placement ?? "unknown",
    destination: context.destination ?? "external",
    affiliateId: context.affiliateId ?? null,
  });

  pushSelectItemEvent({
    currency: productProps.currency,
    value: productProps.productPriceValue ?? undefined,
    items: [productProps.item],
  });
}

export function trackCheckoutSuccessBanner(product: ProductData, options?: { affiliateId?: string | null }) {
  const productProps = buildProductProperties(product);

  captureEvent("product_checkout_success_banner_viewed", {
    ...productProps,
    affiliateId: options?.affiliateId ?? null,
  });
}
