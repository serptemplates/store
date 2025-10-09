"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAnalytics } from "./gtm";

export function CheckoutPageTracking() {
  const { trackBeginCheckout } = useAnalytics();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const productSlug = searchParams.get("product");
    
    if (!productSlug) return;

    // Track begin_checkout event
    // We'll use a placeholder value since we don't have the product details here
    // In a real implementation, you might fetch product details or pass them as props
    trackBeginCheckout({
      productName: productSlug,
      productId: productSlug,
      value: 0, // This should be populated with actual price
      currency: 'USD',
    });
  }, [searchParams, trackBeginCheckout]);

  return null;
}
