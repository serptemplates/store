"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { useCheckoutRedirect } from "@/components/product/useCheckoutRedirect"
import { trackCheckoutError, trackCheckoutPageViewed, trackCheckoutSessionReady } from "@/lib/analytics/checkout"
import type { EcommerceItem } from "@/lib/analytics/gtm"

type CheckoutProductSummary = {
  slug: string
  name: string
  price: number
  priceDisplay: string
  currency: string
}

function buildFallbackProduct(slug: string): CheckoutProductSummary {
  const normalized = slug.trim().toLowerCase()
  const title = normalized
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

  return {
    slug: normalized,
    name: title,
    price: 0,
    priceDisplay: "$0.00",
    currency: "USD",
  }
}

async function fetchProductSummary(slug: string, signal: AbortSignal): Promise<CheckoutProductSummary> {
  const response = await fetch(`/api/checkout/products/${slug}`, {
    method: "GET",
    signal,
  })

  if (!response.ok) {
    throw new Error(`Unable to load checkout product (${response.status})`)
  }

  const payload = (await response.json()) as {
    slug: string
    name?: string
    title?: string
    price?: number
    priceDisplay?: string
    currency?: string
  }

  return {
    slug: payload.slug ?? slug,
    name: payload.name ?? payload.title ?? slug,
    price: typeof payload.price === "number" ? payload.price : 0,
    priceDisplay: payload.priceDisplay ?? "$0.00",
    currency: payload.currency ?? "USD",
  }
}

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const productSlug = (searchParams.get("product") ?? "").trim()
  const couponFromQuery =
    searchParams.get("coupon") ??
    searchParams.get("couponCode") ??
    searchParams.get("discount") ??
    searchParams.get("promo") ??
    undefined
  const normalizedCoupon = couponFromQuery?.trim() ? couponFromQuery.trim().toUpperCase() : undefined

  const affiliateParam =
    searchParams.get("aff") ??
    searchParams.get("affiliate") ??
    searchParams.get("affiliateId") ??
    searchParams.get("am_id") ??
    undefined
  const affiliateId = affiliateParam?.trim() || undefined

  const [product, setProduct] = useState<CheckoutProductSummary | null>(null)
  const [productError, setProductError] = useState<string | null>(null)
  const [isProductLoading, setIsProductLoading] = useState<boolean>(true)
  const [redirectError, setRedirectError] = useState<string | null>(null)

  const viewTrackedRef = useRef(false)
  const sessionTrackedRef = useRef(false)

  useEffect(() => {
    if (!productSlug) {
      router.replace("/")
    }
  }, [productSlug, router])

  useEffect(() => {
    if (!productSlug) {
      setProduct(null)
      setIsProductLoading(false)
      setProductError("Product missing. Please return to the store and try again.")
      return
    }

    setIsProductLoading(true)
    setProductError(null)

    const controller = new AbortController()

    fetchProductSummary(productSlug, controller.signal)
      .then((summary) => {
        setProduct(summary)
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return
        }
        console.error("Failed to load checkout product", error)
        setProduct(buildFallbackProduct(productSlug))
        setProductError("We couldn't load product details, but you can continue with checkout.")
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsProductLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [productSlug])

  const analyticsCurrency = product?.currency ?? "USD"
  const analyticsValue = product?.price ?? undefined
  const productName = product?.name ?? (productSlug || null)
  const ecommerceItem = useMemo<EcommerceItem | undefined>(() => {
    if (!product) {
      return undefined
    }

    return {
      item_id: product.slug,
      item_name: product.name,
      price: Number(product.price.toFixed(2)),
      quantity: 1,
    }
  }, [product])

  useEffect(() => {
    if (!productSlug) {
      return
    }
    if (viewTrackedRef.current) {
      return
    }

    trackCheckoutPageViewed({
      productSlug,
      productName,
      affiliateId: affiliateId ?? null,
      currency: analyticsCurrency,
      value: analyticsValue ?? undefined,
      ecommerceItem,
      couponCode: normalizedCoupon ?? null,
    })

    viewTrackedRef.current = true
  }, [affiliateId, analyticsCurrency, analyticsValue, ecommerceItem, normalizedCoupon, productName, productSlug])

  const { isLoading: isCheckoutLoading, beginCheckout } = useCheckoutRedirect({
    offerId: productSlug || "",
    affiliateId,
    metadata: {
      landerId: productSlug || "",
    },
    endpoint: "/api/checkout/session",
    fallbackUrl: productSlug ? `/product-details/product/${productSlug}` : "/",
    onSessionReady: (session) => {
      setRedirectError(null)
      trackCheckoutSessionReady({
        provider: "stripe",
        productSlug: productSlug || null,
        productName,
        affiliateId: affiliateId ?? null,
        currency: analyticsCurrency,
        value: analyticsValue ?? undefined,
        ecommerceItem,
        isInitialSelection: !sessionTrackedRef.current,
      })
      sessionTrackedRef.current = true
      if (session?.id) {
        console.debug("[checkout] session ready", session.id)
      }
    },
    onError: (error, step) => {
      const message = error instanceof Error ? error.message : "Checkout failed. Please try again."
      setRedirectError(message)
      trackCheckoutError(error, {
        step,
        productSlug: productSlug || null,
        productName,
        affiliateId: affiliateId ?? null,
        currency: analyticsCurrency,
        value: analyticsValue ?? undefined,
        ecommerceItem,
      })
    },
  })

  const handleBeginCheckout = useCallback(() => {
    if (!productSlug) {
      return
    }
    setRedirectError(null)
    void beginCheckout({
      couponCode: normalizedCoupon,
    })
  }, [beginCheckout, normalizedCoupon, productSlug])

  const isBusy = isProductLoading || isCheckoutLoading

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-12">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Continue to Stripe Checkout</h1>
          <p className="mt-2 text-sm text-gray-600">
            Click the button below to launch Stripe&apos;s secure checkout and finish your purchase.
          </p>

          <div className="mt-4 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-4 text-left">
            <p className="text-sm font-medium text-gray-900">Product</p>
            <p className="text-base text-gray-800">{productName ?? "Unknown product"}</p>
            <p className="text-sm text-gray-600">
              Amount: <span className="font-semibold">{product?.priceDisplay ?? "--"}</span>
            </p>
            {normalizedCoupon ? (
              <p className="text-xs text-blue-600">
                Coupon <strong>{normalizedCoupon}</strong> will be applied automatically.
              </p>
            ) : null}
            {productError ? (
              <p className="text-xs text-yellow-700">{productError}</p>
            ) : null}
          </div>

          <button
            type="button"
            className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleBeginCheckout}
            disabled={isBusy || !productSlug}
          >
            {isCheckoutLoading ? "Contacting Stripe…" : "Continue to Stripe Checkout"}
          </button>

          {redirectError ? (
            <p className="mt-3 text-sm text-red-600">{redirectError}</p>
          ) : null}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600">
          <p>
            Having trouble? Try allowing pop-ups for apps.serp.co or email
            {" "}
            <a href="mailto:support@serp.co" className="font-medium text-blue-600 hover:underline">
              support@serp.co
            </a>
            {" "}
            with your order details.
          </p>
        </div>
      </div>
    </div>
  )
}

export const dynamic = "force-dynamic"
