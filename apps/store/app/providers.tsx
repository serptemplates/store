"use client"

import { Analytics } from "@vercel/analytics/react"
import { GoogleTagManager } from "@next/third-parties/google"
import { SpeedInsights } from "@vercel/speed-insights/next"

// Web Vitals configuration
const analyticsConfig = {
  debug: process.env.NODE_ENV === "development",
}

const speedInsightsEnabled = process.env.NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS === "true";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {/* Web Vitals and performance monitoring */}
      <Analytics {...analyticsConfig} />
      {/* Speed Insights needs the Vercel-managed script; only load when explicitly enabled */}
      {speedInsightsEnabled && <SpeedInsights />}

      {/* Load GTM only if configured */}
      {process.env.NEXT_PUBLIC_GTM_ID && (
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
      )}
    </>
  )
}
