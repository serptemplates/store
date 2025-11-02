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

  /**
   * Handle buy button click
   * Creates a checkout session with Dub attribution if stripe.price_id is available
   * Otherwise falls back to the Payment Link
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
          // Redirect to the checkout session
          window.location.href = sessionUrl
        } else {
          // Failed to create session - fallback to Payment Link if available
          const paymentLink = product.payment_link
          const fallback =
            fallbackUrl ||
            (paymentLink && "live_url" in paymentLink ? paymentLink.live_url : undefined)
          if (fallback) {
            window.location.href = fallback
          } else {
            throw new Error("No checkout URL available")
          }
        }
      } catch (error) {
        setIsCreatingSession(false)
        const err = error instanceof Error ? error : new Error(String(error))
        onCheckoutError?.(err)

        // Try to fallback to Payment Link
        const paymentLink = product.payment_link
        const fallback =
          fallbackUrl ||
          (paymentLink && "live_url" in paymentLink ? paymentLink.live_url : undefined)
        if (fallback) {
          window.location.href = fallback
        }
      }
    },
    [
      product,
      fallbackUrl,
      isCreatingSession,
      onCheckoutStart,
      onCheckoutError,
    ],
  )

  return {
    handleBuyClick,
    isCreatingSession,
    hasPriceId: Boolean(product.stripe?.price_id),
  }
}
