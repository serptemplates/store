"use client"

import { useState, useEffect, useCallback, ChangeEvent, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from "@stripe/react-stripe-js"
import { PayPalCheckoutButton } from "@/components/paypal-button"
import type { CheckoutProduct } from "@/components/checkout/types"
import { trackCheckoutError, trackCheckoutPageViewed, trackCheckoutPaymentMethodSelected, trackCheckoutSessionReady } from "@/lib/analytics/checkout"
import { requireStripePublishableKey } from "@/lib/payments/stripe-environment"
import type { EcommerceItem } from "@/lib/analytics/gtm"

// Initialize Stripe
const stripePromise = loadStripe(requireStripePublishableKey())

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

  const [product, setProduct] = useState<CheckoutProduct | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [clientSecret, setClientSecret] = useState("")
  const [showPayPal, setShowPayPal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [termsAcceptedAt, setTermsAcceptedAt] = useState(
    () => new Date().toISOString()
  )
  const [orderBumpSelected, setOrderBumpSelected] = useState(false)
  const productName = product?.name ?? null

  useEffect(() => {
    if (!productSlug) {
      router.push("/")
      return
    }

    let isCancelled = false
    const controller = new AbortController()

    async function loadProduct() {
      setIsLoading(true)
      setError(null)
      setProduct(null)
      setOrderBumpSelected(false)

      try {
        const response = await fetch(`/api/checkout/products/${productSlug}`, {
          method: "GET",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to load product (${response.status})`)
        }

        const data = (await response.json()) as CheckoutProduct

        if (isCancelled) {
          return
        }

        setProduct(data)
        setOrderBumpSelected(data.orderBump?.defaultSelected ?? false)
      } catch (err) {
        if (isCancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return
        }
        console.error("Error loading product:", err)
        setError("Unable to load product details. Please try again.")
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadProduct()

    return () => {
      isCancelled = true
      controller.abort()
    }
  }, [productSlug, router])

  const basePrice = typeof product?.price === "number" ? product.price : 67.0
  const orderBumpPrice = product?.orderBump?.price ?? 0
  const finalPrice = Number(
    (basePrice + (orderBumpSelected && product?.orderBump ? orderBumpPrice : 0)).toFixed(2),
  )
  const currency = product?.currency ?? "USD"
  const finalPriceDisplay = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(finalPrice),
    [currency, finalPrice],
  )

  const ecommerceItem = useMemo<EcommerceItem | undefined>(() => {
    if (!product || !productSlug) {
      return undefined
    }
    return {
      item_id: product.slug ?? productSlug,
      item_name: product.name ?? productSlug,
      price: finalPrice,
      quantity: 1,
    }
  }, [product, productSlug, finalPrice])

  useEffect(() => {
    if (!productSlug || !product || !ecommerceItem) {
      return
    }

    trackCheckoutPageViewed({
      productSlug,
      productName,
      affiliateId: affiliateId ?? null,
      currency,
      value: finalPrice,
      ecommerceItem,
    })
  }, [productSlug, product, productName, affiliateId, currency, finalPrice, ecommerceItem])

  // Create Stripe checkout session
  const fetchClientSecret = useCallback(async () => {
    if (!product || !termsAccepted || !productSlug) return null

    try {
      setClientSecret("")

      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: productSlug,
          uiMode: "embedded", // Request embedded mode
          affiliateId,
          orderBump: product.orderBump
            ? {
                id: product.orderBump.id,
                selected: orderBumpSelected,
              }
            : undefined,
          metadata: {
            landerId: productSlug,
            checkoutSource: "custom_checkout_stripe",
            termsAccepted: "true",
            termsAcceptedAt,
            ...(product.orderBump
              ? {
                  orderBumpId: product.orderBump.id,
                  orderBumpSelected: orderBumpSelected ? "true" : "false",
                  orderBumpPrice: product.orderBump.priceDisplay,
                }
              : {}),
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
        currency,
        value: finalPrice,
        ecommerceItem,
        isInitialSelection: true,
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
  }, [product, productSlug, affiliateId, termsAccepted, termsAcceptedAt, productName, currency, finalPrice, ecommerceItem, orderBumpSelected])

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

  const handleOrderBumpToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setOrderBumpSelected(event.target.checked)
  }, [])

  const handleSelectStripe = useCallback(() => {
    setShowPayPal(false)
    if (showPayPal) {
      trackCheckoutPaymentMethodSelected("stripe", {
        productSlug: productSlug ?? null,
        productName,
        affiliateId: affiliateId ?? null,
        currency,
        value: finalPrice,
        ecommerceItem,
      })
    }
  }, [showPayPal, productSlug, productName, affiliateId, currency, finalPrice, ecommerceItem])

  const handleSelectPayPal = useCallback(() => {
    setShowPayPal(true)
    if (!showPayPal) {
      trackCheckoutPaymentMethodSelected("paypal", {
        productSlug: productSlug ?? null,
        productName,
        affiliateId: affiliateId ?? null,
        currency,
        value: finalPrice,
        ecommerceItem,
      })

      trackCheckoutSessionReady({
        provider: "paypal",
        productSlug: productSlug ?? null,
        productName,
        affiliateId: affiliateId ?? null,
        currency,
        value: finalPrice,
        ecommerceItem,
      })
    }
  }, [showPayPal, productSlug, productName, affiliateId, currency, finalPrice, ecommerceItem])

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  const paypalMetadata: Record<string, string> = {
    landerId: productSlug || '',
    checkoutSource: "custom_checkout_paypal",
  }

  if (termsAccepted) {
    paypalMetadata.termsAccepted = "true"
    paypalMetadata.termsAcceptedAt = termsAcceptedAt
  }

  if (product?.orderBump) {
    paypalMetadata.orderBumpId = product.orderBump.id
    paypalMetadata.orderBumpSelected = orderBumpSelected ? "true" : "false"
    paypalMetadata.orderBumpPrice = product.orderBump.priceDisplay
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {product && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  You&apos;re ordering
                </p>
                <h1 className="text-xl font-semibold text-gray-900">
                  {product.title || product.name}
                </h1>
              </div>
              <div className="text-sm text-gray-700 sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Today&apos;s total
                </p>
                <p className="text-2xl font-bold text-gray-900">{finalPriceDisplay}</p>
                {product.originalPriceDisplay && (
                  <p className="text-xs text-gray-500 line-through">
                    {product.originalPriceDisplay}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

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
                price={finalPriceDisplay}
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

        {product.orderBump && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                {product.orderBump.badge && (
                  <span className="inline-flex items-center rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    {product.orderBump.badge}
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-amber-900">
                    {product.orderBump.title}
                  </h3>
                  {product.orderBump.subtitle && (
                    <p className="text-sm text-amber-700">{product.orderBump.subtitle}</p>
                  )}
                  {product.orderBump.description && (
                    <p className="text-sm text-amber-700">{product.orderBump.description}</p>
                  )}
                </div>

                <div className="flex items-baseline gap-3 text-amber-900">
                  {product.orderBump.originalPriceDisplay && (
                    <span className="text-sm font-medium text-amber-600 line-through">
                      {product.orderBump.originalPriceDisplay}
                    </span>
                  )}
                  <span className="text-xl font-bold">
                    {product.orderBump.priceDisplay}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    One-time add-on
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-3 self-start rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm transition hover:border-amber-500 hover:bg-amber-50">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  checked={orderBumpSelected}
                  onChange={handleOrderBumpToggle}
                />
                <span>{orderBumpSelected ? "Added to order" : "Yes, add this upgrade"}</span>
              </label>
            </div>

            {product.orderBump.points.length > 0 && (
              <ul className="mt-4 grid gap-2 text-sm text-amber-800 sm:grid-cols-2">
                {product.orderBump.points.map((point, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1 text-amber-500">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}

            {product.orderBump.note && (
              <p className="mt-4 text-sm text-amber-700">{product.orderBump.note}</p>
            )}

            <div className="mt-5 flex flex-col gap-2 rounded-md border border-amber-200 bg-white/80 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium">
                {orderBumpSelected ? "Total with upgrade" : "Current total"}
              </span>
              <span className="text-lg font-semibold">{finalPriceDisplay}</span>
            </div>

            {product.orderBump.terms && (
              <p className="mt-3 text-xs text-amber-600">{product.orderBump.terms}</p>
            )}
          </div>
        )}

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
