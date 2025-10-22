"use client";

import { useCallback, useState } from "react";

export interface CheckoutRedirectSession {
  id: string | null;
  url: string;
}

export interface UseCheckoutRedirectOptions {
  offerId: string;
  endpoint?: string;
  affiliateId?: string;
  metadata?: Record<string, string>;
  fallbackUrl: string;
  onSessionReady?: (session: CheckoutRedirectSession) => void;
  onError?: (error: unknown, step: string) => void;
  navigate?: (url: string) => void;
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
  const {
    offerId,
    endpoint = "/api/checkout/session",
    affiliateId,
    metadata,
    fallbackUrl,
    onSessionReady,
    onError,
    navigate,
  } = options;
  const [isLoading, setIsLoading] = useState(false);

  const beginCheckout = useCallback(async (overrides?: BeginCheckoutOverrides) => {
    if (isLoading) {
      return;
    }

    if (!endpoint) {
      onError?.(new Error("Checkout endpoint not configured"), "missing_endpoint");
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

      if (!mergedMetadata.checkoutSource) {
        mergedMetadata.checkoutSource = "hosted_checkout_stripe";
      }

      const requestPayload: Record<string, unknown> = {
        offerId,
        quantity: finalQuantity,
        metadata: mergedMetadata,
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

      const responseClone = response.clone();
      let responseBody: { id?: string | null; url?: string | null; error?: string | null } | null = null;

      try {
        responseBody = (await response.json()) as {
          id?: string | null;
          url?: string | null;
          error?: string | null;
        } | null;
      } catch (parseError) {
        const responseText = await responseClone.text().catch(() => null);
        if (parseError instanceof Error) {
          const enriched = parseError as Error & { step?: string; responseText?: string | null };
          enriched.step = "create_session_non_json";
          enriched.responseText = responseText ?? null;
          throw enriched;
        }

        const enriched = new Error("Checkout session returned non-JSON response") as Error & {
          step: string;
          responseText: string | null;
        };
        enriched.step = "create_session_non_json";
        enriched.responseText = responseText ?? null;
        throw enriched;
      }

      if (!response.ok) {
        const fallbackMessage =
          typeof responseBody?.error === "string" && responseBody.error.trim().length > 0
            ? responseBody.error
            : `Failed to create checkout session (${response.status})`;

        const enriched = new Error(fallbackMessage) as Error & { step: string; status: number };
        enriched.step = "create_session_response";
        enriched.status = response.status;
        throw enriched;
      }

      if (typeof responseBody?.url !== "string" || responseBody.url.trim().length === 0) {
        const enriched = new Error("Checkout session missing redirect URL") as Error & { step: string };
        enriched.step = "missing_redirect_url";
        throw enriched;
      }

      const redirectUrl = responseBody.url;
      const sessionId = typeof responseBody.id === "string" ? responseBody.id : null;

      onSessionReady?.({
        id: sessionId,
        url: redirectUrl,
      });

      if (navigate) {
        navigate(redirectUrl);
      } else if (typeof window !== "undefined") {
        window.location.assign(redirectUrl);
      }
    } catch (rawError) {
      const error = rawError instanceof Error ? rawError : new Error(String(rawError));
      const enrichedError = error as Error & { step?: string };
      const step = typeof enrichedError.step === "string" ? enrichedError.step : "create_session_fetch";

      onError?.(error, step);
      console.error("[checkout] redirect failed", error);
      if (!onError) {
        const resolvedFallbackUrl =
          (!fallbackUrl || fallbackUrl.trim().length === 0)
            ? (typeof window !== "undefined" ? window.location.href : null)
            : fallbackUrl;
        if (resolvedFallbackUrl) {
          if (navigate) {
            navigate(resolvedFallbackUrl);
          } else if (typeof window !== "undefined") {
            window.location.assign(resolvedFallbackUrl);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [affiliateId, endpoint, fallbackUrl, isLoading, metadata, navigate, offerId, onError, onSessionReady]);

  return { isLoading, beginCheckout };
}
