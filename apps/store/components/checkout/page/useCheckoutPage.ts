"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useCheckoutRedirect } from "@/components/product/useCheckoutRedirect"
import type { CheckoutProduct } from "@/components/checkout/types"

import {
  checkoutSchema,
  type AppliedCoupon,
  type CheckoutFormData,
  type CheckoutPageState,
  type CouponFeedback,
  type OrderSummary,
} from "./types"

const mockProducts: Record<string, CheckoutProduct> = {
  "tiktok-downloader": {
    slug: "tiktok-downloader",
    name: "TikTok Downloader",
    title: "TikTok Downloader",
    price: 67.0,
    originalPrice: 97.0,
  },
}

function buildDefaultProduct(slug: string): CheckoutProduct {
  const normalizedName = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

  return {
    slug,
    name: normalizedName,
    title: normalizedName,
    price: 67.0,
    originalPrice: 97.0,
  }
}

function computeOrderSummary(product: CheckoutProduct | null, appliedCoupon: AppliedCoupon | null): OrderSummary {
  const basePrice = product?.price ?? 67.0
  const priceInCents = Math.round(basePrice * 100)

  if (!appliedCoupon?.discount) {
    return { displayPrice: basePrice, savings: 0 }
  }

  const { discount } = appliedCoupon
  let discountedCents = priceInCents

  if (discount.type === "percentage") {
    discountedCents = Math.max(0, Math.round(priceInCents - priceInCents * (discount.amount / 100)))
  } else {
    discountedCents = Math.max(0, priceInCents - discount.amount)
  }

  return {
    displayPrice: discountedCents / 100,
    savings: (priceInCents - discountedCents) / 100,
  }
}

export interface UseCheckoutPageResult {
  state: CheckoutPageState
  register: UseFormReturn<CheckoutFormData>["register"]
  handleSubmit: UseFormReturn<CheckoutFormData>["handleSubmit"]
  errors: UseFormReturn<CheckoutFormData>["formState"]["errors"]
  isSubmitting: boolean
  isCheckoutLoading: boolean
  onSubmit: (data: CheckoutFormData) => Promise<void>
  applyCoupon: (code: string) => Promise<boolean>
  clearCoupon: () => void
  setShowCoupon: (value: boolean) => void
}

export function useCheckoutPage(): UseCheckoutPageResult {
  const searchParams = useSearchParams()
  const router = useRouter()

  const productSlug = searchParams.get("product") ?? ""
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
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [couponFeedback, setCouponFeedback] = useState<CouponFeedback | null>(null)

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
  const couponCodeValue = watch("couponCode") ?? ""

  const { isLoading: isCheckoutLoading, beginCheckout } = useCheckoutRedirect({
    offerId: productSlug || "",
    affiliateId,
    metadata: {
      landerId: productSlug || "",
    },
    endpoint: "/api/checkout/session",
    fallbackUrl: "#",
  })

  const applyCoupon = useCallback(
    async (inputCode: string): Promise<boolean> => {
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
    },
    [setValue],
  )

  const clearCoupon = useCallback(() => {
    setAppliedCoupon(null)
    setCouponFeedback(null)
    setValue("couponCode", "")
  }, [setValue])

  useEffect(() => {
    if (!appliedCoupon) {
      return
    }

    const normalizedInput = couponCodeValue.trim().toUpperCase()

    if (!normalizedInput) {
      clearCoupon()
      return
    }

    if (normalizedInput !== appliedCoupon.code) {
      clearCoupon()
    }
  }, [appliedCoupon, clearCoupon, couponCodeValue])

  useEffect(() => {
    if (productSlug) {
      const productData = mockProducts[productSlug] || buildDefaultProduct(productSlug)
      setProduct(productData)
    } else {
      router.push("/")
    }
    setIsLoading(false)
  }, [productSlug, router])

  useEffect(() => {
    clearCoupon()
    setShowCoupon(false)
  }, [clearCoupon, productSlug])

  const orderSummary = useMemo(() => computeOrderSummary(product, appliedCoupon), [appliedCoupon, product])
  const finalPrice = orderSummary.displayPrice

  const onSubmit = useCallback(
    async (data: CheckoutFormData) => {
      const trimmedCouponInput = data.couponCode?.trim()
      const normalizedInput = trimmedCouponInput ? trimmedCouponInput.toUpperCase() : undefined

      if (normalizedInput && appliedCoupon?.code !== normalizedInput) {
        const applied = await applyCoupon(normalizedInput)
        if (!applied) {
          return
        }
      }

      const customerName = `${data.firstName} ${data.lastName}`.trim()
      const normalizedCoupon = appliedCoupon?.code || normalizedInput || undefined

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
    },
    [appliedCoupon?.code, applyCoupon, beginCheckout],
  )

  const state: CheckoutPageState = {
    product,
    isLoading,
    productSlug,
    affiliateId,
    finalPrice,
    orderSummary,
    paymentMethod,
    couponCodeValue,
    showCoupon,
    isApplyingCoupon,
    appliedCoupon,
    couponFeedback,
  }

  return {
    state,
    register,
    handleSubmit,
    errors,
    isSubmitting,
    isCheckoutLoading,
    onSubmit,
    applyCoupon,
    clearCoupon,
    setShowCoupon,
  }
}
