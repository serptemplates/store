"use client"

import { useState, useEffect, useCallback, ChangeEvent } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from "@stripe/react-stripe-js"
import { PayPalCheckoutButton } from "@/components/paypal-button"
import { trackCheckoutError, trackCheckoutPageViewed, trackCheckoutPaymentMethodSelected, trackCheckoutSessionReady } from "@/lib/analytics/checkout"
import { requireStripePublishableKey } from "@/lib/payments/stripe-environment"

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
  const affiliateParam =
    searchParams.get("aff") ??
    searchParams.get("affiliate") ??
    searchParams.get("affiliateId") ??
    searchParams.get("am_id")
  const affiliateId = affiliateParam?.trim() || undefined

  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [clientSecret, setClientSecret] = useState("")
  const [showPayPal, setShowPayPal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [termsAcceptedAt, setTermsAcceptedAt] = useState(
    () => new Date().toISOString()
  )
  const productName = product?.name ?? null

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

  useEffect(() => {
    if (!productSlug) {
      return
    }

    trackCheckoutPageViewed({
      productSlug,
      productName,
      affiliateId: affiliateId ?? null,
    })
  }, [productSlug, productName, affiliateId])

  // Create Stripe checkout session
  const fetchClientSecret = useCallback(async () => {
    if (!product || !termsAccepted) return null

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
            checkoutSource: "custom_checkout_stripe",
            termsAccepted: "true",
            termsAcceptedAt,
          },
        }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        trackCheckoutError(data.error, {
          productSlug: productSlug ?? null,
          productName,
          affiliateId: affiliateId ?? null,
          step: "create_session_response",
        })
        return null
      }

      trackCheckoutSessionReady({
        provider: "stripe",
        productSlug: productSlug ?? null,
        productName,
        affiliateId: affiliateId ?? null,
      })

      return data.client_secret
    } catch (err) {
      console.error("Error creating checkout session:", err)
      setError("Failed to initialize checkout. Please try again.")
      trackCheckoutError(err, {
        productSlug: productSlug ?? null,
        productName,
        affiliateId: affiliateId ?? null,
        step: "create_session_fetch",
      })
      return null
    }
  }, [product, productSlug, affiliateId, termsAccepted, termsAcceptedAt, productName])

  // Initialize Stripe checkout when component mounts
  useEffect(() => {
    if (!termsAccepted) {
      setClientSecret("")
      return
    }

    if (product && !showPayPal) {
      fetchClientSecret().then(secret => {
        if (secret) {
          setClientSecret(secret)
        }
      })
    }
  }, [product, showPayPal, fetchClientSecret, termsAccepted])

  const handleTermsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const accepted = event.target.checked
    setTermsAccepted(accepted)
    if (accepted) {
      setTermsAcceptedAt(new Date().toISOString())
    }
  }

  const handleSelectStripe = useCallback(() => {
    setShowPayPal(false)
    if (showPayPal) {
      trackCheckoutPaymentMethodSelected("stripe", {
        productSlug: productSlug ?? null,
        productName,
        affiliateId: affiliateId ?? null,
      })
    }
  }, [showPayPal, productSlug, productName, affiliateId])

  const handleSelectPayPal = useCallback(() => {
    setShowPayPal(true)
    if (!showPayPal) {
      trackCheckoutPaymentMethodSelected("paypal", {
        productSlug: productSlug ?? null,
        productName,
        affiliateId: affiliateId ?? null,
      })

      trackCheckoutSessionReady({
        provider: "paypal",
        productSlug: productSlug ?? null,
        productName,
        affiliateId: affiliateId ?? null,
      })
    }
  }, [showPayPal, productSlug, productName, affiliateId])

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  const finalPrice = product?.price || 67.00

  const paypalMetadata: Record<string, string> = {
    landerId: productSlug || '',
    checkoutSource: "custom_checkout_paypal",
  }

  if (termsAccepted) {
    paypalMetadata.termsAccepted = "true"
    paypalMetadata.termsAcceptedAt = termsAcceptedAt
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Payment Method Toggle */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleSelectStripe}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                !showPayPal
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Pay with Stripe
            </button>
            <button
              onClick={handleSelectPayPal}
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
            clientSecret && termsAccepted ? (
              <div id="checkout" className="relative">
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
                  <p className="text-gray-600">
                    {termsAccepted ? "Loading payment form..." : "Please agree to the Terms to continue"}
                  </p>
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
                metadata={paypalMetadata}
                buttonText="Pay with PayPal"
                className="w-full"
                disabled={!termsAccepted}
              />

              <p className="text-xs text-gray-500 text-center">
                You&apos;ll be redirected to PayPal to complete your purchase
              </p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={termsAccepted}
                onChange={handleTermsChange}
              />
              <span className="text-sm text-gray-700">
                By placing your order, you agree to our
                {" "}
                <a
                  href="https://github.com/serpapps/legal/blob/main/terms-conditions.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Terms and Conditions
                </a>
                {" "}and{" "}
                <a
                  href="https://github.com/serpapps/legal/blob/main/refund-policy.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Refund Policy
                </a>
                .
              </span>
            </label>
            {!termsAccepted && (
              <p className="mt-2 text-xs text-red-600">
                You must accept the Terms and Refund Policy before completing your purchase.
              </p>
            )}
          </div>
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
