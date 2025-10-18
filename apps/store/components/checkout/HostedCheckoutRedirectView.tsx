"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import type { CheckoutProduct } from "@/components/checkout/types"
import { trackCheckoutError, trackCheckoutPageViewed, trackCheckoutSessionReady } from "@/lib/analytics/checkout"
import type { EcommerceItem } from "@/lib/analytics/gtm"

function buildMetadata(options: {
  productSlug: string
  checkoutSource: string
  affiliateId?: string | null
  orderBumpId?: string | null
  orderBumpSelected?: boolean
  orderBumpPriceDisplay?: string | null
  termsAcceptedAt: string
}) {
  const metadata: Record<string, string> = {
    landerId: options.productSlug,
    checkoutSource: options.checkoutSource,
    termsAccepted: "true",
    termsAcceptedAt: options.termsAcceptedAt,
  }

  if (options.affiliateId) {
    metadata.affiliateId = options.affiliateId
  }

  if (options.orderBumpId) {
    metadata.orderBumpId = options.orderBumpId
  }

  if (typeof options.orderBumpSelected === "boolean") {
    metadata.orderBumpSelected = options.orderBumpSelected ? "true" : "false"
  }

  if (options.orderBumpPriceDisplay) {
    metadata.orderBumpPrice = options.orderBumpPriceDisplay
  }

  return metadata
}

function getAffiliateId(searchParams: URLSearchParams): string | undefined {
  const affiliateParam =
    searchParams.get("aff") ??
    searchParams.get("affiliate") ??
    searchParams.get("affiliateId") ??
    searchParams.get("am_id")

  const trimmed = affiliateParam?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

function computeEcommerceItem(product: CheckoutProduct | null, slug: string | null, finalPrice: number): EcommerceItem | undefined {
  if (!product || !slug) {
    return undefined
  }

  return {
    item_id: product.slug ?? slug,
    item_name: product.name ?? slug,
    price: finalPrice,
    quantity: 1,
  }
}

type HostedStatus = "loading" | "redirecting" | "error";

export function HostedCheckoutRedirectView() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const productSlug = searchParams.get("product")
  const affiliateId = getAffiliateId(searchParams)
  const termsAcceptedAt = useRef(new Date().toISOString())
  const releaseId = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? null

  const [product, setProduct] = useState<CheckoutProduct | null>(null)
  const [isFetchingProduct, setIsFetchingProduct] = useState(false)
  const [status, setStatus] = useState<HostedStatus>("loading")
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!productSlug) {
      return
    }

    let cancelled = false
    const controller = new AbortController()

    async function loadProduct() {
      setIsFetchingProduct(true)
      setError(null)

      try {
        const response = await fetch(`/api/checkout/products/${productSlug}`, {
          method: "GET",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to load product (${response.status})`)
        }

        const data = (await response.json()) as CheckoutProduct
        if (!cancelled) {
          setProduct(data)
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return
        }
        console.error("[hosted-checkout] product load failed", err)
        setError("Unable to load product details. Try again or use the embedded checkout.")
      } finally {
        if (!cancelled) {
          setIsFetchingProduct(false)
        }
      }
    }

    void loadProduct()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [productSlug, retryCount])

  const orderBumpSelected = useMemo(
    () => product?.orderBump?.defaultSelected ?? false,
    [product],
  )

  const finalPrice = useMemo(() => {
    const basePrice = typeof product?.price === "number" ? product.price : 0
    const bumpPrice = orderBumpSelected && product?.orderBump ? product.orderBump.price : 0
    return Number((basePrice + bumpPrice).toFixed(2))
  }, [orderBumpSelected, product])

  const ecommerceItem = useMemo(
    () => computeEcommerceItem(product, productSlug, finalPrice),
    [product, productSlug, finalPrice],
  )

  useEffect(() => {
    if (!product || !productSlug) {
      return
    }

    trackCheckoutPageViewed({
      productSlug,
      productName: product.name ?? productSlug,
      affiliateId: affiliateId ?? null,
      currency: product.currency ?? "USD",
      value: finalPrice,
      ecommerceItem,
    })
  }, [affiliateId, ecommerceItem, finalPrice, product, productSlug])

  const createHostedSession = useCallback(async () => {
    if (!product || !productSlug) {
      return
    }

    setStatus("redirecting")
    setError(null)

    const metadata = buildMetadata({
      productSlug,
      checkoutSource: "stripe_checkout",
      affiliateId,
      orderBumpId: product.orderBump?.id ?? null,
      orderBumpSelected,
      orderBumpPriceDisplay: product.orderBump?.priceDisplay ?? null,
      termsAcceptedAt: termsAcceptedAt.current,
    })

    const payload: Record<string, unknown> = {
      offerId: productSlug,
      uiMode: "hosted" as const,
      metadata,
    }

    if (affiliateId) {
      payload.affiliateId = affiliateId
    }

    if (product.orderBump) {
      payload.orderBump = {
        id: product.orderBump.id,
        selected: orderBumpSelected,
      }
    }

    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const contentType = response.headers.get("content-type") ?? ""
      if (!contentType.includes("application/json")) {
        const body = await response.text()
        throw new Error(`Unexpected response: ${body}`)
      }

      const data = (await response.json()) as {
        id?: string
        url?: string
        error?: unknown
      }

      if (!response.ok || !data.url) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to create hosted checkout session",
        )
      }

      trackCheckoutSessionReady({
        provider: "stripe",
        productSlug,
        productName: product.name ?? productSlug,
        affiliateId: affiliateId ?? null,
        currency: product.currency ?? "USD",
        value: finalPrice,
        ecommerceItem,
        isInitialSelection: true,
      })

      if (typeof window !== "undefined") {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("[hosted-checkout] session creation failed", err)
      setStatus("error")
      const message = err instanceof Error ? err.message : "Unable to create hosted checkout session"
      setError(message)
      trackCheckoutError(err, {
        productSlug,
        productName: product.name ?? productSlug,
        affiliateId: affiliateId ?? null,
        currency: product.currency ?? "USD",
        value: finalPrice,
        ecommerceItem,
        step: "hosted_checkout_create_session",
        release: releaseId,
      })
    }
  }, [affiliateId, ecommerceItem, finalPrice, orderBumpSelected, product, productSlug, releaseId])

  useEffect(() => {
    if (!productSlug) {
      setStatus("error")
      setError("Missing product identifier in checkout URL.")
      return
    }

    if (product && !isFetchingProduct && status === "loading") {
      void createHostedSession()
    }
  }, [createHostedSession, isFetchingProduct, product, productSlug, status])

  const handleRetry = useCallback(() => {
    setRetryCount((value) => value + 1)
    setProduct(null)
    setStatus("loading")
    setError(null)
  }, [])

  const handleOpenEmbedded = useCallback(() => {
    if (!productSlug) {
      router.push("/")
      return
    }

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("ui", "embedded")
      window.location.href = url.toString()
      return
    }

    router.push(`/checkout?product=${productSlug}&ui=embedded` as const)
  }, [productSlug, router])

  if (!productSlug) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-6 text-center space-y-3">
          <h1 className="text-xl font-semibold text-gray-900">Product missing</h1>
          <p className="text-gray-600">The checkout link is missing a product identifier. Please start over from the product page.</p>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-6 space-y-4 text-center">
          <h1 className="text-xl font-semibold text-gray-900">We couldn&apos;t open Stripe Checkout</h1>
          <p className="text-gray-600">{error ?? "Something went wrong while preparing the secure checkout session."}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRetry}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Try Again
            </button>
            <button
              onClick={handleOpenEmbedded}
              className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition"
            >
              Use Embedded Checkout Instead
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-6 text-center space-y-4">
        <Loader2 className="mx-auto h-10 w-10 text-blue-600 animate-spin" />
        <h1 className="text-xl font-semibold text-gray-900">Redirecting to Stripe…</h1>
        <p className="text-gray-600">
          Preparing your secure checkout session. You&apos;ll be redirected automatically in a moment.
          If nothing happens, use the buttons below.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={createHostedSession}
            disabled={status === "redirecting" || isFetchingProduct}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "redirecting" ? "Contacting Stripe…" : "Retry Redirect"}
          </button>
          <button
            onClick={handleOpenEmbedded}
            className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition"
          >
            Open Embedded Checkout
          </button>
        </div>
      </div>
    </div>
  )
}
