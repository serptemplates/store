"use client";

import { useEffect } from "react";
import { useAnalytics } from "./gtm";
import type { ProductData } from "@/lib/products/product-schema";
import { parsePriceString } from "@/lib/analytics-utils";

interface ProductPageTrackingProps {
  product: ProductData;
}

export function ProductPageTracking({ product }: ProductPageTrackingProps) {
  const { trackViewProduct } = useAnalytics();

  useEffect(() => {
    // Extract price from product data using utility function
    const price = parsePriceString(product.pricing?.price);

    // Track product view
    trackViewProduct({
      productId: product.slug,
      productName: product.name,
      price: price,
      currency: 'USD',
    });
  }, [product.slug, product.name, product.pricing, trackViewProduct]);

  return null;
}
