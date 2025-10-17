"use client"

import React, { useState, useEffect, useCallback, ChangeEvent, useMemo, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from "@stripe/react-stripe-js"
import { PayPalCheckoutButton } from "@/components/paypal-button"
import type { CheckoutProduct } from "@/components/checkout/types"
import { trackCheckoutError, trackCheckoutOrderBumpToggled, trackCheckoutPageViewed, trackCheckoutPaymentMethodSelected, trackCheckoutSessionReady } from "@/lib/analytics/checkout"
import { requireStripePublishableKey } from "@/lib/payments/stripe-environment"
import type { EcommerceItem } from "@/lib/analytics/gtm"
import { Check, Loader2 } from "lucide-react"

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
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)
  const [showPayPal, setShowPayPal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [termsAcceptedAt, setTermsAcceptedAt] = useState(
    () => new Date().toISOString()
  )
  const [orderBumpSelected, setOrderBumpSelected] = useState(false)
  const [isRefreshingSession, setIsRefreshingSession] = useState(false)
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null)
  const [stripeSessionUrl, setStripeSessionUrl] = useState<string | null>(null)
  const [showStripeFallback, setShowStripeFallback] = useState(false)
  const [stripeUnavailable, setStripeUnavailable] = useState(false)
  const productName = product?.name ?? null
  const initialStripeSession = useRef(true)

  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fallbackReasonRef = useRef<
    "timeout" | "stripe_load_failed" | "iframe_error" | "session_error" | null
  >(null)
  const fallbackTrackedRef = useRef(false)
  const sessionFallbackCopy =
    "We couldn't create the embedded checkout session. Continue securely on Stripe."
  const releaseId = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? null
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
        initialStripeSession.current = true
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
  const basePriceDisplay = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(basePrice),
    [currency, basePrice],
  )
  const finalPriceDisplay = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(finalPrice),
    [currency, finalPrice],
  )

  const upgradePriceDisplay = product?.orderBump?.priceDisplay ?? undefined
  const orderBumpHighlights = product?.orderBump?.points.slice(0, 3) ?? []

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

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
  }, [])

  const logFallback = useCallback(
    (message: string, step: string, detail?: unknown) => {
      if (fallbackTrackedRef.current) {
        return
      }
      fallbackTrackedRef.current = true

      trackCheckoutError(detail ?? message, {
        productSlug: productSlug ?? null,
        productName,
        affiliateId: affiliateId ?? null,
        currency,
        value: finalPrice,
        ecommerceItem,
        step,
        release: releaseId,
      })
    },
    [affiliateId, currency, ecommerceItem, finalPrice, productName, productSlug, releaseId],
  )

  const triggerFallback = useCallback(
    (
      reason: "timeout" | "stripe_load_failed" | "iframe_error" | "session_error",
      detail?: unknown,
    ) => {
      if (fallbackReasonRef.current && fallbackReasonRef.current !== reason) {
        setShowStripeFallback(true)
        return
      }

      fallbackReasonRef.current = reason

      if (reason === "timeout") {
        logFallback("Embedded checkout timed out", "embedded_checkout_timeout", detail)
      } else if (reason === "stripe_load_failed") {
        setStripeUnavailable(true)
        logFallback("Stripe JS failed to load", "embedded_checkout_stripe_unavailable", detail)
      } else if (reason === "iframe_error") {
        logFallback(
          "Embedded checkout iframe reported an error",
          "embedded_checkout_iframe_error",
          detail,
        )
      } else if (reason === "session_error") {
        logFallback(
          "Checkout session response was invalid",
          "embedded_checkout_session_error",
          detail,
        )
      }

      setShowStripeFallback(true)
      clearFallbackTimer()
    },
    [clearFallbackTimer, logFallback],
  )

  useEffect(() => {
    let isMounted = true

    async function initStripe() {
      try {
        const promise = loadStripe(requireStripePublishableKey())
        if (!isMounted) {
          return
        }
        setStripePromise(promise)
        const stripe = await promise
        if (!isMounted) {
          return
        }
        if (!stripe) {
          throw new Error("loadStripe resolved to null")
        }
      } catch (err) {
        if (!isMounted) {
          return
        }
        console.error("Stripe failed to initialize:", err)
        triggerFallback(
          "stripe_load_failed",
          err instanceof Error ? err : new Error(String(err)),
        )
      }
    }

    void initStripe()

    return () => {
      isMounted = false
    }
  }, [triggerFallback])

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

    const payload = {
      offerId: productSlug,
      uiMode: "embedded" as const,
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
    }

    const createHostedFallback = async (message: string, detail: unknown) => {
      setError(message)
      triggerFallback("session_error", detail)

      try {
        const hostedResponse = await fetch("/api/checkout/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, uiMode: "hosted" as const }),
        })

        const hostedContentType = hostedResponse.headers.get("content-type") ?? ""
        if (!hostedContentType.includes("application/json")) {
          const hostedBody = await hostedResponse.text()
          console.error("Hosted checkout returned non-JSON response:", hostedBody)
        trackCheckoutError(new Error("Hosted checkout non-JSON response"), {
          productSlug: productSlug ?? null,
          productName,
          affiliateId: affiliateId ?? null,
          step: "create_session_hosted_response",
          release: releaseId,
        })
          return null
        }

        const hostedData = (await hostedResponse.json()) as {
          id?: string
          url?: string
        }

        if (typeof hostedData?.url === "string") {
          setStripeSessionUrl(hostedData.url)
        }
        if (typeof hostedData?.id === "string") {
          setStripeSessionId(hostedData.id)
        }
      } catch (hostedError) {
        console.error("Error creating hosted fallback session:", hostedError)
        trackCheckoutError(hostedError, {
          productSlug: productSlug ?? null,
          productName,
          affiliateId: affiliateId ?? null,
          step: "create_session_hosted_fetch",
          release: releaseId,
        })
      }

      return null
    }

    try {
      setClientSecret("")
      setStripeSessionId(null)
      setStripeSessionUrl(null)

      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const contentType = response.headers.get("content-type") ?? ""

      if (!contentType.includes("application/json")) {
        const rawBody = await response.text()
        console.error("Checkout session returned non-JSON response:", rawBody)
        trackCheckoutError(new Error("Checkout session non-JSON response"), {
          productSlug: productSlug ?? null,
          productName,
          affiliateId: affiliateId ?? null,
          step: "create_session_non_json",
          release: releaseId,
        })
        return createHostedFallback(sessionFallbackCopy, {
          status: response.status,
          body: rawBody,
        })
      }

      const data = (await response.json()) as {
        id?: string
        url?: string
        client_secret?: string
        error?: unknown
      }

      if (!response.ok || (data && typeof data.error === "string")) {
        const apiErrorMessage =
          typeof data?.error === "string" ? data.error : sessionFallbackCopy

        trackCheckoutError(apiErrorMessage, {
          productSlug: productSlug ?? null,
          productName,
          affiliateId: affiliateId ?? null,
          step: "create_session_response",
          release: releaseId,
        })

        return createHostedFallback(apiErrorMessage, {
          status: response.status,
          data,
        })
      }

      if (!data?.client_secret) {
        console.error("Checkout session missing client_secret:", data)
        trackCheckoutError(new Error("Missing client_secret"), {
          productSlug: productSlug ?? null,
          productName,
          affiliateId: affiliateId ?? null,
          step: "create_session_missing_client_secret",
          release: releaseId,
        })
        return createHostedFallback(sessionFallbackCopy, {
          status: response.status,
          data,
        })
      }

      const isInitialSelection = initialStripeSession.current
      const sessionId = typeof data.id === "string" ? data.id : null
      const sessionUrl = typeof data.url === "string" ? data.url : null
      setStripeSessionId(sessionId)
      setStripeSessionUrl(sessionUrl)
      trackCheckoutSessionReady({
        provider: "stripe",
        productSlug: productSlug ?? null,
        productName,
        affiliateId: affiliateId ?? null,
        currency,
        value: finalPrice,
        ecommerceItem,
        isInitialSelection,
      })
      initialStripeSession.current = false

      return data.client_secret
    } catch (err) {
      console.error("Error creating checkout session:", err)
      trackCheckoutError(err, {
        productSlug: productSlug ?? null,
        productName,
        affiliateId: affiliateId ?? null,
        step: "create_session_fetch",
        release: releaseId,
      })

      return createHostedFallback(sessionFallbackCopy, err instanceof Error ? { message: err.message } : err)
    }
  }, [
    affiliateId,
    currency,
    ecommerceItem,
    finalPrice,
    orderBumpSelected,
    product,
    productName,
    productSlug,
    sessionFallbackCopy,
    termsAccepted,
    termsAcceptedAt,
    triggerFallback,
    releaseId,
  ])

  // Initialize Stripe checkout when component mounts
  useEffect(() => {
    if (!termsAccepted) {
      setClientSecret("")
      setStripeSessionId(null)
      setStripeSessionUrl(null)
      clearFallbackTimer()
      if (fallbackReasonRef.current !== "stripe_load_failed") {
        setShowStripeFallback(false)
        fallbackReasonRef.current = null
        fallbackTrackedRef.current = false
      }
      return
    }

    if (product && !showPayPal) {
      let isActive = true
      setIsRefreshingSession(true)
      setClientSecret("")

      fetchClientSecret()
        .then((secret) => {
          if (!isActive || !secret) {
            return
          }
          setClientSecret(secret)
        })
        .finally(() => {
          if (isActive) {
            setIsRefreshingSession(false)
          }
        })

      return () => {
        isActive = false
      }
    }

    setIsRefreshingSession(false)
  }, [product, showPayPal, fetchClientSecret, termsAccepted, clearFallbackTimer])

  useEffect(() => {
    if (showPayPal || !termsAccepted) {
      clearFallbackTimer()
      return
    }

    if (stripeUnavailable) {
      clearFallbackTimer()
      setShowStripeFallback(true)
      return
    }

    if (clientSecret && stripePromise) {
      clearFallbackTimer()
      return
    }

    if (!isRefreshingSession) {
      clearFallbackTimer()
      return
    }

    clearFallbackTimer()
    fallbackTimerRef.current = setTimeout(() => {
      triggerFallback("timeout")
    }, 8000)

    return () => {
      clearFallbackTimer()
    }
  }, [
    showPayPal,
    termsAccepted,
    clientSecret,
    stripePromise,
    stripeUnavailable,
    isRefreshingSession,
    triggerFallback,
    clearFallbackTimer,
  ])

  useEffect(() => {
    const handleStripeMessage = (event: MessageEvent) => {
      if (!event || typeof event.data !== "object" || event.data === null) {
        return
      }

      const origin = typeof event.origin === "string" ? event.origin : ""
      if (!origin) {
        return
      }

      let host: string
      try {
        host = new URL(origin).hostname
      } catch {
        return
      }
      const isTrustedStripeHost = host === "stripe.com" || host.endsWith(".stripe.com")
      if (!isTrustedStripeHost) {
        return
      }

      const rawType = (event.data as { type?: string }).type
      const messageType = typeof rawType === "string" ? rawType.toLowerCase() : ""
      const payloadEvent = (() => {
        const payload = (event.data as { payload?: { event?: string } }).payload
        if (payload && typeof payload.event === "string") {
          return payload.event.toLowerCase()
        }
        return ""
      })()

      if (
        (messageType.includes("checkout") && messageType.includes("error")) ||
        (payloadEvent.includes("checkout") && payloadEvent.includes("error"))
      ) {
        triggerFallback("iframe_error", event.data)
      }
    }

    window.addEventListener("message", handleStripeMessage)
    return () => {
      window.removeEventListener("message", handleStripeMessage)
    }
  }, [triggerFallback])

  const handleTermsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const accepted = event.target.checked
    setTermsAccepted(accepted)
    if (accepted) {
      setTermsAcceptedAt(new Date().toISOString())
    }
  }

  const handleOrderBumpToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked
    setOrderBumpSelected(checked)

    if (product?.orderBump) {
      const nextValue = Number((basePrice + (checked ? orderBumpPrice : 0)).toFixed(2))
      const nextEcommerceItem: EcommerceItem | undefined = productSlug
        ? {
            item_id: product.slug ?? productSlug,
            item_name: product.name ?? productSlug,
            price: nextValue,
            quantity: 1,
          }
        : undefined

      trackCheckoutOrderBumpToggled(checked, {
        productSlug: productSlug ?? null,
        productName,
        affiliateId: affiliateId ?? null,
        currency,
        value: nextValue,
        ecommerceItem: nextEcommerceItem,
        orderBumpId: product.orderBump.id,
        orderBumpPrice: product.orderBump.price,
      })
    }
  }, [product, basePrice, orderBumpPrice, productSlug, productName, affiliateId, currency])

  const handleSelectStripe = useCallback(() => {
    setShowPayPal(false)
    clearFallbackTimer()
    if (fallbackReasonRef.current !== "stripe_load_failed") {
      setStripeUnavailable(false)
      setShowStripeFallback(false)
      fallbackReasonRef.current = null
      fallbackTrackedRef.current = false
    }
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
  }, [
    showPayPal,
    productSlug,
    productName,
    affiliateId,
    currency,
    finalPrice,
    ecommerceItem,
    clearFallbackTimer,
  ])

  const handleSelectPayPal = useCallback(() => {
    setShowPayPal(true)
    clearFallbackTimer()
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
  }, [
    showPayPal,
    productSlug,
    productName,
    affiliateId,
    currency,
    finalPrice,
    ecommerceItem,
    clearFallbackTimer,
  ])

  const handleOpenStripeFallback = useCallback(() => {
    const fallbackUrl =
      stripeSessionUrl ?? (stripeSessionId ? `https://checkout.stripe.com/c/pay/${stripeSessionId}` : null)

    if (!fallbackUrl) {
      trackCheckoutError("Stripe fallback requested without session URL", {
        productSlug: productSlug ?? null,
        productName,
        affiliateId: affiliateId ?? null,
        currency,
        value: finalPrice,
        ecommerceItem,
        step: "embedded_checkout_fallback_missing",
        release: releaseId,
      })
      return
    }

    trackCheckoutError("Opening hosted Stripe checkout fallback", {
      productSlug: productSlug ?? null,
      productName,
      affiliateId: affiliateId ?? null,
      currency,
      value: finalPrice,
      ecommerceItem,
      step: "embedded_checkout_fallback_clicked",
      release: releaseId,
    })

    window.open(fallbackUrl, "_blank", "noopener,noreferrer")
  }, [
    stripeSessionUrl,
    stripeSessionId,
    productSlug,
    productName,
    affiliateId,
    currency,
    finalPrice,
    ecommerceItem,
    releaseId,
  ])

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

  const canRenderEmbeddedCheckout = Boolean(
    clientSecret && termsAccepted && !stripeUnavailable && stripePromise && !showStripeFallback,
  )

  const fallbackMessage =
    fallbackReasonRef.current === "stripe_load_failed"
      ? "We couldn't load the embedded checkout. You can finish safely on Stripe in a new tab."
      : fallbackReasonRef.current === "iframe_error"
        ? "We ran into a problem loading the embedded checkout. Continue securely on Stripe."
        : fallbackReasonRef.current === "session_error"
          ? sessionFallbackCopy
          : "Still waiting? Open the secure Stripe checkout in a new tab."

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Payment Method Toggle */}
        <div className="bg-white rounded-lg shadow-sm px-5 py-3 mb-3">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleSelectStripe}
              className={`px-7 py-2.5 rounded-lg font-semibold transition-colors ${
                !showPayPal
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Pay with Stripe
            </button>
            <button
              onClick={handleSelectPayPal}
              className={`px-7 py-2.5 rounded-lg font-semibold transition-colors ${
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
              canRenderEmbeddedCheckout ? (
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
                  <div className="text-center space-y-4">
                    {!showStripeFallback && (
                      <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">
                          {termsAccepted ? "Loading payment form..." : "Please agree to the Terms to continue"}
                        </p>
                      </>
                    )}
                    {showStripeFallback && (
                      <div className="space-y-3">
                        <div className="flex justify-center mb-2">
                          <Loader2 className="h-6 w-6 text-blue-600 animate-spin" aria-hidden="true" />
                        </div>
                        <p className="text-gray-600">
                          {termsAccepted ? "We're preparing the secure Stripe checkout." : "Please agree to the Terms to continue"}
                        </p>
                        {termsAccepted && (
                          <>
                            <p
                              data-testid="checkout-fallback-message"
                              className="text-sm text-gray-500"
                            >
                              {fallbackMessage}
                            </p>
                            <button
                              type="button"
                              onClick={handleOpenStripeFallback}
                              className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                              disabled={!stripeSessionUrl && !stripeSessionId}
                            >
                              Open secure Stripe checkout
                            </button>
                            {!stripeSessionUrl && !stripeSessionId && (
                              <p className="text-xs text-gray-400">
                                If the button stays disabled, refresh the page or temporarily turn off blocking extensions.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
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
          <div className="mt-6 rounded-xl border border-green-200 bg-white p-6 shadow-sm min-h-56">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="col-span-2 space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-semibold text-green-900">
                    {product.orderBump.title}
                  </h3>
                </div>
                {product.orderBump.description && (
                  <p className="text-base text-green-700 leading-relaxed">
                    {product.orderBump.description}
                  </p>
                )}

                {orderBumpHighlights.length > 0 && (
                  <ul className="mt-2 space-y-2 text-sm text-green-800">
                    {orderBumpHighlights.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-600" strokeWidth={3} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-3 lg:items-end lg:text-right h-full justify-start">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-green-700 whitespace-nowrap">
                    LIMITED TIME
                    {product.orderBump.defaultSelected && (
                      <span className="rounded-full bg-green-600/10 px-1.5 py-0.5 text-green-700">Popular</span>
                    )}
                  </span>
                  <div className="flex lg:justify-end items-baseline gap-1">
                    <span className="text-3xl font-bold text-green-900">
                      {upgradePriceDisplay ?? "$—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <label
              className={`flex items-center gap-3 mt-6 p-4 rounded-lg border-2 border-green-300 bg-green-50 font-medium transition cursor-pointer hover:border-green-400 hover:bg-green-100 ${
                isRefreshingSession ? "cursor-wait opacity-70" : ""
              }`}
            >
              <input
                type="checkbox"
                className="h-6 w-6 rounded border-green-300 text-green-600 focus:ring-green-500"
                checked={orderBumpSelected}
                onChange={handleOrderBumpToggle}
                disabled={isRefreshingSession}
              />
              <span className="text-base text-green-900">{orderBumpSelected ? "Added ✓" : "Yes, add it to my order"}</span>
            </label>

            {product.orderBump.terms && (
              <p className="mt-4 text-xs text-green-600">{product.orderBump.terms}</p>
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
