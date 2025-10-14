import type { UseFormRegister } from "react-hook-form"

import type { CheckoutFormData } from "./types"

interface PaymentMethodSectionProps {
  register: UseFormRegister<CheckoutFormData>
}

export function PaymentMethodSection({ register }: PaymentMethodSectionProps) {
  return (
    <div className="border-t pt-4 sm:pt-6">
      <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Payment Information</h2>

      <div className="space-y-2">
        <label className="relative flex flex-col p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
          <div className="flex items-start">
            <input {...register("paymentMethod")} type="radio" value="card" className="mt-0.5 h-4 w-4 text-blue-600" />
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Pay with Stripe</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Recommended</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 sm:gap-2 text-xs text-gray-600">
                <span className="inline-flex items-center gap-0.5 sm:gap-1">
                  <span className="inline-block bg-blue-600 text-white text-[10px] sm:text-xs px-1 rounded">VISA</span>
                  <span className="inline-block bg-red-500 text-white text-[10px] sm:text-xs px-1 rounded">MC</span>
                  <span className="inline-block bg-blue-700 text-white text-[10px] sm:text-xs px-1 rounded">AMEX</span>
                  <span className="inline-block bg-orange-500 text-white text-[10px] sm:text-xs px-1 rounded">DISC</span>
                </span>
                <span className="inline-flex items-center gap-0.5 sm:gap-1">
                  <span className="inline-block bg-black text-white text-[10px] sm:text-xs px-1 rounded">Apple Pay</span>
                  <span className="inline-block bg-gray-700 text-white text-[10px] sm:text-xs px-1 rounded">Google Pay</span>
                </span>
                <span className="inline-flex items-center gap-0.5 sm:gap-1">
                  <span className="inline-block bg-pink-600 text-white text-[10px] sm:text-xs px-1 rounded">Klarna</span>
                  <span className="inline-block bg-teal-600 text-white text-[10px] sm:text-xs px-1 rounded">Afterpay</span>
                </span>
                <span className="inline-block bg-green-600 text-white text-[10px] sm:text-xs px-1 rounded">Bank</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Secure checkout powered by Stripe. Available methods shown at checkout.
              </p>
            </div>
          </div>
        </label>

        <label className="flex items-center p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
          <input {...register("paymentMethod")} type="radio" value="paypal" className="h-4 w-4 text-blue-600" />
          <div className="ml-3">
            <span className="text-sm font-medium">PayPal</span>
            <p className="text-xs text-gray-500">Pay with PayPal account or credit card</p>
          </div>
        </label>
      </div>

      <div className="mt-3 p-3 bg-gray-50 rounded-md">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> You&apos;ll be redirected to complete payment securely. Final payment options depend on your
          location and order total.
        </p>
      </div>
    </div>
  )
}
