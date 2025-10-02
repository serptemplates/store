"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useCheckoutRedirect } from "@/components/product/useCheckoutRedirect"
import { PayPalCheckoutButton } from "@/components/paypal-button"

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
const mockProducts: Record<string, any> = {
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
  const affiliateId = searchParams.get("aff") || undefined

  const [showCoupon, setShowCoupon] = useState(false)
  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

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
    if (data.paymentMethod === "card") {
      // Pass form data to Stripe checkout
      await beginCheckout()
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

  const finalPrice = product?.price || 67.00

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
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                  >
                    Apply
                  </button>
                </div>
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
                disabled={isSubmitting || isCheckoutLoading}
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