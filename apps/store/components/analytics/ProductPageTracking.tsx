"use client";

import { useEffect } from "react";
import { useAnalytics } from "./gtm";
import type { ProductData } from "@/lib/products/product-schema";

interface ProductPageTrackingProps {
  product: ProductData;
}

export function ProductPageTracking({ product }: ProductPageTrackingProps) {
  const { trackViewProduct } = useAnalytics();

  useEffect(() => {
    // Extract price from product data
    let price = 0;
    
    // Try to get price from pricing object
    if (product.pricing?.price) {
      const priceStr = product.pricing.price.replace(/[^0-9.]/g, '');
      price = parseFloat(priceStr) || 0;
    }

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
