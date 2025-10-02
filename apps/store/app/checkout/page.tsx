import { EmbeddedCheckoutView } from "@/components/checkout/EmbeddedCheckoutView"
import { CheckoutErrorBoundary } from "@/components/checkout/CheckoutErrorBoundary"

export default function CheckoutPage() {
  return (
    <CheckoutErrorBoundary>
      <EmbeddedCheckoutView />
    </CheckoutErrorBoundary>
  )
}