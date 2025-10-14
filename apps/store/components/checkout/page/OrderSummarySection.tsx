import type { UseFormRegister } from "react-hook-form"

import type {
  AppliedCoupon,
  CheckoutFormData,
  CouponFeedback,
  OrderSummary,
} from "./types"

interface OrderSummarySectionProps {
  orderSummary: OrderSummary
  showCoupon: boolean
  onShowCoupon: (value: boolean) => void
  register: UseFormRegister<CheckoutFormData>
  appliedCoupon: AppliedCoupon | null
  couponFeedback: CouponFeedback | null
  isApplyingCoupon: boolean
  onApplyCoupon: () => void
  onRemoveCoupon: () => void
}

export function OrderSummarySection({
  orderSummary,
  showCoupon,
  onShowCoupon,
  register,
  appliedCoupon,
  couponFeedback,
  isApplyingCoupon,
  onApplyCoupon,
  onRemoveCoupon,
}: OrderSummarySectionProps) {
  return (
    <div className="border-t pt-4 sm:pt-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base sm:text-lg font-semibold">Order Summary</h2>
        <span className="text-xl sm:text-2xl font-bold">${orderSummary.displayPrice.toFixed(2)}</span>
      </div>

      {appliedCoupon ? (
        <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          <span>
            Coupon <strong>{appliedCoupon.code}</strong> applied
            {orderSummary.savings > 0 ? <> — you save ${orderSummary.savings.toFixed(2)}</> : null}
          </span>
          <button
            type="button"
            onClick={onRemoveCoupon}
            className="text-xs font-medium text-green-800 hover:underline"
          >
            Remove
          </button>
        </div>
      ) : null}

      {!showCoupon ? (
        <button
          type="button"
          onClick={() => onShowCoupon(true)}
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
            onClick={onApplyCoupon}
            disabled={isApplyingCoupon}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isApplyingCoupon ? "Applying..." : "Apply"}
          </button>
        </div>
      )}

      {couponFeedback ? (
        <p
          className={`mt-2 text-xs ${
            couponFeedback.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {couponFeedback.message}
        </p>
      ) : null}
    </div>
  )
}
