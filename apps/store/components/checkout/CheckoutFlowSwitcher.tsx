"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"

import { CheckoutErrorBoundary } from "@/components/checkout/CheckoutErrorBoundary"
import { EmbeddedCheckoutView } from "@/components/checkout/EmbeddedCheckoutView"
import { HostedCheckoutRedirectView } from "@/components/checkout/HostedCheckoutRedirectView"
import { getCheckoutUiMode, resolveCheckoutUiModeOverride } from "@/lib/checkout/ui-mode"

const DEFAULT_MODE = getCheckoutUiMode()

function CheckoutFallback() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-600">Loading checkout...</p>
    </div>
  )
}

export function CheckoutFlowSwitcher() {
  const searchParams = useSearchParams()

  const override = useMemo(() => {
    const uiOverride = searchParams.get("ui") ?? searchParams.get("checkout")
    return resolveCheckoutUiModeOverride(uiOverride)
  }, [searchParams])

  const mode = override ?? DEFAULT_MODE

  if (mode === "hosted") {
    return <HostedCheckoutRedirectView />
  }

  return (
    <CheckoutErrorBoundary>
      <Suspense fallback={<CheckoutFallback />}>
        <EmbeddedCheckoutView />
      </Suspense>
    </CheckoutErrorBoundary>
  )
}
