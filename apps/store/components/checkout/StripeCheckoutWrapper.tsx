"use client"

import { loadStripe } from "@stripe/stripe-js"
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from "@stripe/react-stripe-js"
import { requireStripePublishableKey } from "@/lib/payments/stripe-environment"
import type { CheckoutProduct } from "@/components/checkout/types"
import { useState, useEffect } from "react"

// Only initialize Stripe when this component loads
const stripePromise = loadStripe(requireStripePublishableKey())

interface Props {
  product: CheckoutProduct
  affiliateId?: string
}

export function StripeCheckoutWrapper({ product, affiliateId }: Props) {
  const [clientSecret, setClientSecret] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function createCheckoutSession() {
      try {
        const response = await fetch("/api/checkout/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offerId: product.slug,
            quantity: 1,
            affiliateId,
          }),
        })

        const data = await response.json()

        if (data.clientSecret) {
          setClientSecret(data.clientSecret)
        } else {
          setError("Failed to create checkout session")
        }
      } catch (err) {
        setError("Failed to create checkout session")
        console.error(err)
      }
    }

    createCheckoutSession()
  }, [product.slug, affiliateId])

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        {error}
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-gray-100 rounded-lg"></div>
      </div>
    )
  }

  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ clientSecret }}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  )
}