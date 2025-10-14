"use client"

import { CheckoutActions } from "./page/CheckoutActions"
import { CheckoutHeader } from "./page/CheckoutHeader"
import { CustomerInformationSection } from "./page/CustomerInformationSection"
import { OrderSummarySection } from "./page/OrderSummarySection"
import { PaymentMethodSection } from "./page/PaymentMethodSection"
import { useCheckoutPage } from "./page/useCheckoutPage"

export function CheckoutPageView() {
  const {
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
  } = useCheckoutPage()

  if (state.isLoading || !state.product) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  const handleApplyCoupon = () => {
    void applyCoupon(state.couponCodeValue)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <CheckoutHeader productName={state.product?.name} />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-6">
            <CustomerInformationSection register={register} errors={errors} />

            <OrderSummarySection
              orderSummary={state.orderSummary}
              showCoupon={state.showCoupon}
              onShowCoupon={(value) => setShowCoupon(value)}
              register={register}
              appliedCoupon={state.appliedCoupon}
              couponFeedback={state.couponFeedback}
              isApplyingCoupon={state.isApplyingCoupon}
              onApplyCoupon={handleApplyCoupon}
              onRemoveCoupon={clearCoupon}
            />

            <PaymentMethodSection register={register} />
          </div>

          <CheckoutActions
            paymentMethod={state.paymentMethod}
            finalPrice={state.finalPrice}
            isSubmitting={isSubmitting}
            isCheckoutLoading={isCheckoutLoading}
            isApplyingCoupon={state.isApplyingCoupon}
            productSlug={state.productSlug}
            affiliateId={state.affiliateId}
            appliedCoupon={state.appliedCoupon}
          />
        </form>
      </div>
    </div>
  )
}
