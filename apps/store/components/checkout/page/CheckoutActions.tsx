import { PayPalCheckoutButton } from "@/components/paypal-button"

import type { AppliedCoupon, CheckoutPaymentMethod } from "./types"

interface CheckoutActionsProps {
  paymentMethod: CheckoutPaymentMethod
  finalPrice: number
  isSubmitting: boolean
  isCheckoutLoading: boolean
  isApplyingCoupon: boolean
  productSlug: string
  affiliateId?: string
  appliedCoupon: AppliedCoupon | null
}

export function CheckoutActions({
  paymentMethod,
  finalPrice,
  isSubmitting,
  isCheckoutLoading,
  isApplyingCoupon,
  productSlug,
  affiliateId,
  appliedCoupon,
}: CheckoutActionsProps) {
  const formattedTotal = `$${finalPrice.toFixed(2)}`

  return (
    <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-sm p-4 sm:p-6">
      <p className="text-xs text-gray-600 mb-3 sm:mb-4">
        Your personal data will be used to process your order, support your experience throughout this website, and for other
        purposes described in our privacy policy.
      </p>

      {paymentMethod === "card" ? (
        <button
          type="submit"
          disabled={isSubmitting || isCheckoutLoading || isApplyingCoupon}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-md text-base sm:text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting || isCheckoutLoading ? "Processing..." : `🔒 Place Your Order ${formattedTotal}`}
        </button>
      ) : (
        <PayPalCheckoutButton
          offerId={productSlug || ""}
          price={formattedTotal}
          affiliateId={affiliateId}
          metadata={{
            landerId: productSlug || "",
            ...(appliedCoupon?.code ? { couponCode: appliedCoupon.code } : {}),
          }}
          buttonText={`Place Your Order ${formattedTotal}`}
          className="w-full"
        />
      )}
    </div>
  )
}
