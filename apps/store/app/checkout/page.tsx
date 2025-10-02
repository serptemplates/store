import { Suspense } from "react"

import { EmbeddedCheckoutView } from "@/components/checkout/EmbeddedCheckoutView"
import { CheckoutErrorBoundary } from "@/components/checkout/CheckoutErrorBoundary"

function CheckoutFallback() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-600">Loading checkout...</p>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <CheckoutErrorBoundary>
      <Suspense fallback={<CheckoutFallback />}>
        <EmbeddedCheckoutView />
      </Suspense>
    </CheckoutErrorBoundary>
  )
}

export const dynamic = "force-dynamic"
