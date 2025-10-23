"use client";

import type { ProductData } from "@/lib/products/product-schema";
import { captureEvent } from "./posthog";
import { pushSelectItemEvent, pushViewItemEvent, type EcommerceItem } from "./gtm";

type ProductEventContext = {
  placement?: "pricing" | "sticky" | "sticky_bar" | "hero" | "unknown";
  destination?: "checkout" | "external" | "waitlist" | "payment_link";
  affiliateId?: string | null;
  paymentLinkProvider?: "stripe" | "ghl" | null;
  paymentLinkVariant?: "live" | "test" | null;
  paymentLinkId?: string | null;
  paymentLinkUrl?: string | null;
};

const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_GA_CURRENCY ?? "USD";

function parsePrice(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const numeric = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

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
  const priceString = product.pricing?.price ?? null;
  const priceValue = parsePrice(priceString);

  return {
    productSlug: product.slug,
    productName: product.name,
    productPlatform: product.platform ?? null,
    productCategories: product.categories ?? [],
    productStatus: product.status ?? null,
    productPriceDisplay: priceString,
    productPriceValue: priceValue,
    productSku: product.sku ?? null,
    productBrand: product.brand ?? null,
    item: getEcommerceItem(product, priceValue),
    currency: product.pricing?.currency ?? DEFAULT_CURRENCY,
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
    paymentLinkProvider: context.paymentLinkProvider ?? null,
    paymentLinkVariant: context.paymentLinkVariant ?? null,
    paymentLinkId: context.paymentLinkId ?? null,
    paymentLinkUrl: context.paymentLinkUrl ?? null,
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
