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

    // Track begin_checkout event without value (we don't have accurate price here)
    // This prevents poisoning revenue attribution with false zeros
    trackBeginCheckout({
      productName: productSlug,
      productId: productSlug,
      currency: 'USD',
    });
  }, [searchParams, trackBeginCheckout]);

  return null;
}
