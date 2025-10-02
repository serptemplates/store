"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from "@stripe/react-stripe-js"
import { PayPalCheckoutButton } from "@/components/paypal-button"
import { requireStripePublishableKey } from "@/lib/stripe-environment"
import "@/styles/checkout.css"

// Initialize Stripe
const stripePromise = loadStripe(requireStripePublishableKey())

// Mock product data
const mockProducts: Record<string, any> = {
  "tiktok-downloader": {
    slug: "tiktok-downloader",
    name: "TikTok Downloader",
    title: "TikTok Downloader",
    price: 67.00,
    originalPrice: 97.00,
  },
}

export function EmbeddedCheckoutView() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const productSlug = searchParams.get("product")
  const affiliateId = searchParams.get("aff") || undefined

  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [clientSecret, setClientSecret] = useState("")
  const [showPayPal, setShowPayPal] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (productSlug) {
      const productData = mockProducts[productSlug] || {
        slug: productSlug,
        name: productSlug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        price: 67.00,
        originalPrice: 97.00,
      }
      setProduct(productData)
    } else {
      router.push("/")
    }
    setIsLoading(false)
  }, [productSlug, router])

  // Create Stripe checkout session
  const fetchClientSecret = useCallback(async () => {
    if (!product) return null

    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: productSlug,
          uiMode: "embedded", // Request embedded mode
          affiliateId,
          metadata: {
            landerId: productSlug,
          },
        }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        return null
      }

      return data.client_secret
    } catch (err) {
      console.error("Error creating checkout session:", err)
      setError("Failed to initialize checkout. Please try again.")
      return null
    }
  }, [product, productSlug, affiliateId])

  // Initialize Stripe checkout when component mounts
  useEffect(() => {
    if (product && !showPayPal) {
      fetchClientSecret().then(secret => {
        if (secret) {
          setClientSecret(secret)
        }
      })
    }
  }, [product, showPayPal, fetchClientSecret])

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  const finalPrice = product?.price || 67.00

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Payment Method Toggle */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setShowPayPal(false)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                !showPayPal
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Pay with Stripe
            </button>
            <button
              onClick={() => setShowPayPal(true)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                showPayPal
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Pay with PayPal
            </button>
          </div>
        </div>

        {/* Checkout Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {!showPayPal ? (
            // Stripe Embedded Checkout
            clientSecret ? (
              <div id="checkout">
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={{ clientSecret }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading payment form...</p>
                </div>
              </div>
            )
          ) : (
            // PayPal Checkout
            <div className="space-y-4">
              <PayPalCheckoutButton
                offerId={productSlug || ''}
                price={`$${finalPrice.toFixed(2)}`}
                affiliateId={affiliateId}
                metadata={{
                  landerId: productSlug || '',
                }}
                buttonText="Pay with PayPal"
                className="w-full"
              />

              <p className="text-xs text-gray-500 text-center">
                You&apos;ll be redirected to PayPal to complete your purchase
              </p>
            </div>
          )}
        </div>

        {/* Trust Badges */}
        <div className="mt-6 text-center">
          <p className="text-sm font-semibold text-gray-700">🔒 Secure Checkout</p>
          <p className="text-xs text-gray-500 mt-1">
            SSL encrypted payment. Your information is secure.
          </p>
        </div>
      </div>
    </div>
  )
}
