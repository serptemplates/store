"use client";

import { useCallback, useState } from "react";

export interface UseCheckoutRedirectOptions {
  offerId: string;
  endpoint?: string;
  affiliateId?: string;
  metadata?: Record<string, string>;
  fallbackUrl: string;
}

export interface UseCheckoutRedirectResult {
  isLoading: boolean;
  beginCheckout: () => Promise<void>;
}

/**
 * Shared Stripe checkout helper that encapsulates the redirect flow
 * and fallback behaviour used across the storefront experiences.
 */
export function useCheckoutRedirect(options: UseCheckoutRedirectOptions): UseCheckoutRedirectResult {
  const { offerId, endpoint = "/api/checkout/session", affiliateId, metadata, fallbackUrl } = options;
  const [isLoading, setIsLoading] = useState(false);

  const beginCheckout = useCallback(async () => {
    if (isLoading) {
      return;
    }

    if (!endpoint) {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offerId,
          affiliateId,
          metadata: {
            ...(metadata ?? {}),
            landerId: metadata?.landerId ?? offerId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create checkout session (${response.status})`);
      }

      const payload = (await response.json()) as { url?: string };

      if (payload?.url) {
        window.open(payload.url, "_blank", "noopener,noreferrer");
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
