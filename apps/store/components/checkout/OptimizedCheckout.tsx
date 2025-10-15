"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import type { CheckoutProduct } from "@/components/checkout/types"

// Lazy load heavy payment components - only load when needed
const StripeCheckout = dynamic(
  () => import("./StripeCheckoutWrapper").then(mod => mod.StripeCheckoutWrapper),
  {
    ssr: false,
    loading: () => <CheckoutSkeleton type="stripe" />
  }
)

const PayPalCheckout = dynamic(
  () => import("@/components/paypal-button").then(mod => ({
    default: mod.PayPalCheckoutButton
  })),
  {
    ssr: false,
    loading: () => <CheckoutSkeleton type="paypal" />
  }
)

function CheckoutSkeleton({ type }: { type: "stripe" | "paypal" }) {
  return (
    <div className="animate-pulse">
      <div className="h-12 bg-gray-200 rounded-lg mb-4"></div>
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      {type === "stripe" && (
        <>
          <div className="h-64 bg-gray-100 rounded-lg mt-4"></div>
        </>
      )}
    </div>
  )
}

export function OptimizedCheckout() {
  const searchParams = useSearchParams()
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal" | null>(null)
  const [product, setProduct] = useState<CheckoutProduct | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const productSlug = searchParams.get("product")
  const affiliateId = searchParams.get("aff") || searchParams.get("affiliate") || undefined

  useEffect(() => {
    async function loadProduct() {
      if (!productSlug) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/product?slug=${productSlug}`)
        if (response.ok) {
          const data = await response.json()
          setProduct(data.product)
        }
      } catch (error) {
        console.error("Error loading product:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProduct()
  }, [productSlug])

  if (isLoading) {
    return <CheckoutSkeleton type="stripe" />
  }

  if (!product) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Product not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{product.name}</h1>
      <p className="text-3xl font-bold mb-8">${product.price}</p>

      {/* Payment method selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Select Payment Method</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setPaymentMethod("stripe")}
            className={`p-4 border-2 rounded-lg transition-colors ${
              paymentMethod === "stripe"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            Credit Card
          </button>
          <button
            onClick={() => setPaymentMethod("paypal")}
            className={`p-4 border-2 rounded-lg transition-colors ${
              paymentMethod === "paypal"
                ? "border-yellow-500 bg-yellow-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            PayPal
          </button>
        </div>
      </div>

      {/* Only load the payment component when selected */}
      {paymentMethod === "stripe" && (
        <Suspense fallback={<CheckoutSkeleton type="stripe" />}>
          <StripeCheckout
            product={product}
            affiliateId={affiliateId}
          />
        </Suspense>
      )}

      {paymentMethod === "paypal" && (
        <Suspense fallback={<CheckoutSkeleton type="paypal" />}>
          <PayPalCheckout
            offerId={product.slug}
            price={product.price.toString()}
            affiliateId={affiliateId}
            metadata={{ productName: product.name }}
          />
        </Suspense>
      )}
    </div>
  )
}