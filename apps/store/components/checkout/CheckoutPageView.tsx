"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useCheckoutRedirect } from "@/components/product/useCheckoutRedirect"
import { PayPalCheckoutButton } from "@/components/paypal-button"
import type { CheckoutProduct } from "@/components/checkout/types"

// Form validation schema
const checkoutSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  country: z.string().min(1, "Country is required"),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(["card", "paypal"]),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

// Mock product data
const mockProducts: Record<string, CheckoutProduct> = {
  "tiktok-downloader": {
    slug: "tiktok-downloader",
    name: "TikTok Downloader",
    title: "TikTok Downloader",
    price: 67.00,
    originalPrice: 97.00,
  },
}

export function CheckoutPageView() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const productSlug = searchParams.get("product")
  const affiliateParam =
    searchParams.get("aff") ??
    searchParams.get("affiliate") ??
    searchParams.get("affiliateId") ??
    searchParams.get("am_id")
  const affiliateId = affiliateParam?.trim() || undefined

  const [showCoupon, setShowCoupon] = useState(false)
  const [product, setProduct] = useState<CheckoutProduct | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount?: { type: "percentage" | "fixed"; amount: number; currency?: string }
  } | null>(null)
  const [couponFeedback, setCouponFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      country: "US",
      couponCode: "",
      paymentMethod: "card",
    },
  })

  const paymentMethod = watch("paymentMethod")
  const couponCodeValue = watch("couponCode")

  const applyCoupon = useCallback(async (inputCode: string): Promise<boolean> => {
    const rawCode = inputCode.trim()

    if (!rawCode) {
      setCouponFeedback({ type: "error", message: "Enter a coupon code" })
      setAppliedCoupon(null)
      return false
    }

    setIsApplyingCoupon(true)
    setCouponFeedback(null)

    try {
      const response = await fetch("/api/checkout/validate-coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ couponCode: rawCode }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to validate coupon")
      }

      if (!payload.valid) {
        setAppliedCoupon(null)
        setCouponFeedback({
          type: "error",
          message: payload.error || "Invalid coupon code",
        })
        return false
      }

      const normalizedCode: string = payload.code || rawCode.toUpperCase()
      setValue("couponCode", normalizedCode)
      setAppliedCoupon({
        code: normalizedCode,
        discount: payload.discount,
      })
      setCouponFeedback({
        type: "success",
        message: `Coupon ${normalizedCode} applied successfully`,
      })
      return true
    } catch (error) {
      console.error("Failed to validate coupon", error)
      setAppliedCoupon(null)
      setCouponFeedback({
        type: "error",
        message: "Unable to validate coupon. Try again.",
      })
      return false
    } finally {
      setIsApplyingCoupon(false)
    }
  }, [setValue])

  useEffect(() => {
    if (!appliedCoupon) {
      return
    }

    const normalizedInput = couponCodeValue?.trim().toUpperCase() || ""

    if (!normalizedInput) {
      setAppliedCoupon(null)
      setCouponFeedback(null)
      return
    }

    if (normalizedInput !== appliedCoupon.code) {
      setAppliedCoupon(null)
      setCouponFeedback(null)
    }
  }, [appliedCoupon, couponCodeValue])

  useEffect(() => {
    if (productSlug) {
      const productData = mockProducts[productSlug] || {
        slug: productSlug,
        name: productSlug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
        title: productSlug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
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
    setAppliedCoupon(null)
    setCouponFeedback(null)
    setValue("couponCode", "")
    setShowCoupon(false)
  }, [productSlug, setValue])

  const { isLoading: isCheckoutLoading, beginCheckout } = useCheckoutRedirect({
    offerId: productSlug || "",
    affiliateId,
    metadata: {
      landerId: productSlug || "",
    },
    endpoint: "/api/checkout/session",
    fallbackUrl: "#",
  })

  const onSubmit = async (data: CheckoutFormData) => {
    const trimmedCouponInput = data.couponCode?.trim()
    const normalizedInput = trimmedCouponInput ? trimmedCouponInput.toUpperCase() : undefined

    if (normalizedInput && appliedCoupon?.code !== normalizedInput) {
      const applied = await applyCoupon(normalizedInput)
      if (!applied) {
        return
      }
    }

    const customerName = `${data.firstName} ${data.lastName}`.trim()
    const normalizedCoupon = appliedCoupon?.code || data.couponCode?.toUpperCase().trim() || undefined

    if (data.paymentMethod === "card") {
      await beginCheckout({
        couponCode: normalizedCoupon,
        customer: {
          email: data.email,
          name: customerName || undefined,
        },
        metadata: {
          country: data.country,
        },
      })
    }
    // PayPal is handled by the PayPal button component
  }

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  const orderSummary = useMemo(() => {
    const basePrice = product?.price ?? 67.0
    const priceInCents = Math.round(basePrice * 100)

    if (!appliedCoupon?.discount) {
      return {
        displayPrice: basePrice,
        savings: 0,
      }
    }

    const { discount } = appliedCoupon
    let discountedCents = priceInCents

    if (discount.type === "percentage") {
      discountedCents = Math.max(
        0,
        Math.round(priceInCents - priceInCents * (discount.amount / 100)),
      )
    } else {
      discountedCents = Math.max(0, priceInCents - discount.amount)
    }

    return {
      displayPrice: discountedCents / 100,
      savings: (priceInCents - discountedCents) / 100,
    }
  }, [appliedCoupon, product?.price])

  const finalPrice = orderSummary.displayPrice

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Checkout</h1>
          {product && (
            <p className="text-sm sm:text-base text-gray-600 mt-1">{product.name}</p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Customer Information */}
            <div>
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Customer Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="john@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      First name <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register("firstName")}
                      type="text"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.firstName ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="John"
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Last name <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register("lastName")}
                      type="text"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.lastName ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Doe"
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Country
                  </label>
                  <select
                    {...register("country")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="US">United States (US)</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="ES">Spain</option>
                    <option value="IT">Italy</option>
                    <option value="JP">Japan</option>
                    <option value="BR">Brazil</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="border-t pt-4 sm:pt-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base sm:text-lg font-semibold">Order Summary</h2>
                <span className="text-xl sm:text-2xl font-bold">${finalPrice.toFixed(2)}</span>
              </div>

              {appliedCoupon && (
                <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                  <span>
                    Coupon <strong>{appliedCoupon.code}</strong> applied
                    {orderSummary.savings > 0 && (
                      <> — you save ${orderSummary.savings.toFixed(2)}</>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null)
                      setCouponFeedback(null)
                      setValue("couponCode", "")
                    }}
                    className="text-xs font-medium text-green-800 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              {!showCoupon ? (
                <button
                  type="button"
                  onClick={() => setShowCoupon(true)}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Have a coupon? Click here to enter your code
                </button>
              ) : (
                <div className="flex gap-2 mt-3">
                  <input
                    {...register("couponCode")}
                    type="text"
                    placeholder="Coupon code"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void applyCoupon(couponCodeValue || "")
                    }}
                    disabled={isApplyingCoupon}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isApplyingCoupon ? "Applying..." : "Apply"}
                  </button>
                </div>
              )}

              {couponFeedback && (
                <p
                  className={`mt-2 text-xs ${
                    couponFeedback.type === "success" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {couponFeedback.message}
                </p>
              )}
            </div>

            {/* Payment Information */}
            <div className="border-t pt-4 sm:pt-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Payment Information</h2>

              <div className="space-y-2">
                {/* Stripe - Multiple Payment Methods */}
                <label className="relative flex flex-col p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                  <div className="flex items-start">
                    <input
                      {...register("paymentMethod")}
                      type="radio"
                      value="card"
                      className="mt-0.5 h-4 w-4 text-blue-600"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Pay with Stripe</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Recommended</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1 sm:gap-2 text-xs text-gray-600">
                        {/* Credit Cards */}
                        <span className="inline-flex items-center gap-0.5 sm:gap-1">
                          <span className="inline-block bg-blue-600 text-white text-[10px] sm:text-xs px-1 rounded">VISA</span>
                          <span className="inline-block bg-red-500 text-white text-[10px] sm:text-xs px-1 rounded">MC</span>
                          <span className="inline-block bg-blue-700 text-white text-[10px] sm:text-xs px-1 rounded">AMEX</span>
                          <span className="inline-block bg-orange-500 text-white text-[10px] sm:text-xs px-1 rounded">DISC</span>
                        </span>
                        {/* Digital Wallets */}
                        <span className="inline-flex items-center gap-0.5 sm:gap-1">
                          <span className="inline-block bg-black text-white text-[10px] sm:text-xs px-1 rounded">Apple Pay</span>
                          <span className="inline-block bg-gray-700 text-white text-[10px] sm:text-xs px-1 rounded">Google Pay</span>
                        </span>
                        {/* Buy Now Pay Later */}
                        <span className="inline-flex items-center gap-0.5 sm:gap-1">
                          <span className="inline-block bg-pink-600 text-white text-[10px] sm:text-xs px-1 rounded">Klarna</span>
                          <span className="inline-block bg-teal-600 text-white text-[10px] sm:text-xs px-1 rounded">Afterpay</span>
                        </span>
                        {/* Bank */}
                        <span className="inline-block bg-green-600 text-white text-[10px] sm:text-xs px-1 rounded">Bank</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Secure checkout powered by Stripe. Available methods shown at checkout.
                      </p>
                    </div>
                  </div>
                </label>

                {/* PayPal */}
                <label className="flex items-center p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                  <input
                    {...register("paymentMethod")}
                    type="radio"
                    value="paypal"
                    className="h-4 w-4 text-blue-600"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium">PayPal</span>
                    <p className="text-xs text-gray-500">Pay with PayPal account or credit card</p>
                  </div>
                </label>
              </div>

              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> You&apos;ll be redirected to complete payment securely.
                  Final payment options depend on your location and order total.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy and Submit */}
          <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <p className="text-xs text-gray-600 mb-3 sm:mb-4">
              Your personal data will be used to process your order, support your experience throughout this website, and for
              other purposes described in our privacy policy.
            </p>

            {paymentMethod === 'card' ? (
              <button
                type="submit"
                disabled={isSubmitting || isCheckoutLoading || isApplyingCoupon}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-md text-base sm:text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting || isCheckoutLoading ? 'Processing...' : `🔒 Place Your Order $${finalPrice.toFixed(2)}`}
              </button>
            ) : (
              <PayPalCheckoutButton
                offerId={productSlug || ''}
                price={`$${finalPrice.toFixed(2)}`}
                affiliateId={affiliateId}
                metadata={{
                  landerId: productSlug || '',
                  ...(appliedCoupon?.code ? { couponCode: appliedCoupon.code } : {}),
                }}
                buttonText={`Place Your Order $${finalPrice.toFixed(2)}`}
                className="w-full"
              />
            )}

          </div>
        </form>
      </div>
    </div>
  )
}
