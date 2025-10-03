"use client";

import { useEffect, useState } from "react";

export interface AffiliateTrackingResult {
  affiliateId?: string;
  checkoutSuccess: boolean;
}

/**
 * Reads affiliate and checkout status information from the current URL.
 * Automatically clears the `checkout` query parameter once observed so
 * success banners do not persist across navigations.
 */
export function useAffiliateTracking(): AffiliateTrackingResult {
  const [affiliateId, setAffiliateId] = useState<string | undefined>();
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const params = url.searchParams;
    const affiliate =
      params.get("aff") ??
      params.get("affiliate") ??
      params.get("affiliateId") ??
      params.get("am_id") ??
      undefined;
    const checkout = params.get("checkout");

    const normalizedAffiliate = affiliate?.trim();
    setAffiliateId(normalizedAffiliate || undefined);
    const isSuccess = checkout === "success";
    setCheckoutSuccess(isSuccess);

    if (checkout) {
      params.delete("checkout");
      url.search = params.toString();
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  return { affiliateId, checkoutSuccess };
}
