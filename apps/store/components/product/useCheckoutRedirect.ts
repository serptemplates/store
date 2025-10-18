"use client";

import { useCallback, useState } from "react";

export interface UseCheckoutRedirectOptions {
  offerId: string;
  endpoint?: string;
  affiliateId?: string;
  metadata?: Record<string, string>;
  fallbackUrl: string;
}

export interface BeginCheckoutOverrides {
  quantity?: number;
  affiliateId?: string;
  couponCode?: string;
  customer?: {
    email?: string;
    name?: string;
  };
  metadata?: Record<string, string>;
}

export interface UseCheckoutRedirectResult {
  isLoading: boolean;
  beginCheckout: (overrides?: BeginCheckoutOverrides) => Promise<void>;
}

/**
 * Shared Stripe checkout helper that encapsulates the redirect flow
 * and fallback behaviour used across the storefront experiences.
 */
export function useCheckoutRedirect(options: UseCheckoutRedirectOptions): UseCheckoutRedirectResult {
  const { offerId, endpoint = "/api/checkout/session", affiliateId, metadata, fallbackUrl } = options;
  const [isLoading, setIsLoading] = useState(false);

  const beginCheckout = useCallback(async (overrides?: BeginCheckoutOverrides) => {
    if (isLoading) {
      return;
    }

    if (!endpoint) {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      setIsLoading(true);

      const finalAffiliateId = overrides?.affiliateId ?? affiliateId;
      const finalQuantity = overrides?.quantity ?? 1;
      const mergedMetadata: Record<string, string> = {
        ...(metadata ?? {}),
        ...(overrides?.metadata ?? {}),
      };

      if (!mergedMetadata.landerId) {
        mergedMetadata.landerId = offerId;
      }

      const requestPayload: Record<string, unknown> = {
        offerId,
        quantity: finalQuantity,
        metadata: mergedMetadata,
        uiMode: "hosted",
      };

      if (finalAffiliateId) {
        requestPayload.affiliateId = finalAffiliateId;
      }

      if (overrides?.couponCode) {
        requestPayload.couponCode = overrides.couponCode;
        mergedMetadata.couponCode = overrides.couponCode;
      }

      if (overrides?.customer) {
        requestPayload.customer = overrides.customer;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create checkout session (${response.status})`);
      }

      const responseBody = (await response.json()) as { url?: string };

      if (responseBody?.url) {
        window.open(responseBody.url, "_blank", "noopener,noreferrer");
        return;
      }

      throw new Error("Checkout session missing redirect URL");
    } catch (error) {
      console.error("[checkout] redirect failed", error);
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsLoading(false);
    }
  }, [affiliateId, endpoint, fallbackUrl, isLoading, metadata, offerId]);

  return { isLoading, beginCheckout };
}
