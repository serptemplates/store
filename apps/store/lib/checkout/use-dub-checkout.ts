/**
 * React hook for handling buy button clicks with Dub attribution
 * Intercepts clicks to create programmatic checkout sessions with proper metadata
 */

import { useCallback, useState } from "react"
import { createSessionWithDub } from "@/lib/checkout/create-session-with-dub"
import type { ProductData } from "@/lib/products/product-schema"

export interface UseDubCheckoutOptions {
  product: ProductData
  fallbackUrl?: string
  onCheckoutStart?: () => void
  onCheckoutError?: (error: Error) => void
}

export function useDubCheckout(options: UseDubCheckoutOptions) {
  const { product, fallbackUrl, onCheckoutStart, onCheckoutError } = options
  const [isCreatingSession, setIsCreatingSession] = useState(false)

  const resolveCheckoutFallback = useCallback((): string | null => {
    if (typeof fallbackUrl === "string" && fallbackUrl.trim().length > 0) {
      return fallbackUrl.trim()
    }

    const ctaHref = product.pricing?.cta_href
    if (typeof ctaHref === "string" && ctaHref.trim().length > 0) {
      return ctaHref.trim()
    }

    return product.slug ? `/checkout/${product.slug}` : null
  }, [fallbackUrl, product.pricing?.cta_href, product.slug])

  /**
   * Handle buy button click
   * Creates a checkout session with Dub attribution if stripe.price_id is available
   * Otherwise relies on the internal checkout CTA fallback
   */
  const handleBuyClick = useCallback(
    async (event?: React.MouseEvent<HTMLAnchorElement>) => {
      // Check if we have the required Stripe price ID
      const priceId = product.stripe?.price_id
      if (!priceId || typeof priceId !== "string") {
        // No price ID - let the default Payment Link behavior happen
        return
      }

      // We have a price ID - intercept the click to create a programmatic session
      event?.preventDefault()

      if (isCreatingSession) {
        // Already creating a session, don't create another
        return
      }

      setIsCreatingSession(true)
      onCheckoutStart?.()

      try {
        const sessionUrl = await createSessionWithDub({
          priceId,
          quantity: 1,
          mode: "payment",
          successUrl: product.success_url,
          cancelUrl: product.cancel_url,
        })

        if (sessionUrl) {
          window.location.href = sessionUrl
          return
        }

        const fallback = resolveCheckoutFallback()
        if (!fallback) {
          throw new Error("No checkout URL available")
        }
        window.location.href = fallback
      } catch (error) {
        setIsCreatingSession(false)
        const err = error instanceof Error ? error : new Error(String(error))
        onCheckoutError?.(err)

        const fallback = resolveCheckoutFallback()
        if (fallback) {
          window.location.href = fallback
        }
      }
    },
    [
      product,
      isCreatingSession,
      onCheckoutStart,
      onCheckoutError,
      resolveCheckoutFallback,
    ],
  )

  return {
    handleBuyClick,
    isCreatingSession,
    hasPriceId: Boolean(product.stripe?.price_id),
  }
}
