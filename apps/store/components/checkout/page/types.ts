import { z } from "zod"

import type { CheckoutProduct } from "@/components/checkout/types"

export const checkoutSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  country: z.string().min(1, "Country is required"),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(["card", "paypal"]),
})

export type CheckoutFormData = z.infer<typeof checkoutSchema>
export type CheckoutPaymentMethod = CheckoutFormData["paymentMethod"]

export interface AppliedCoupon {
  code: string
  discount?: { type: "percentage" | "fixed"; amount: number; currency?: string }
}

export interface CouponFeedback {
  type: "success" | "error"
  message: string
}

export interface OrderSummary {
  displayPrice: number
  savings: number
}

export interface CheckoutPageState {
  product: CheckoutProduct | null
  isLoading: boolean
  productSlug: string
  affiliateId?: string
  finalPrice: number
  orderSummary: OrderSummary
  paymentMethod: CheckoutPaymentMethod
  couponCodeValue: string
  showCoupon: boolean
  isApplyingCoupon: boolean
  appliedCoupon: AppliedCoupon | null
  couponFeedback: CouponFeedback | null
}
