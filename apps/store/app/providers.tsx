"use client"

import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { GoogleTagManager } from "@next/third-parties/google"

// Web Vitals configuration
const analyticsConfig = {
  debug: process.env.NODE_ENV === "development",
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {/* Web Vitals and performance monitoring */}
      <Analytics {...analyticsConfig} />
      <SpeedInsights />

      {/* Load GTM only if configured */}
      {process.env.NEXT_PUBLIC_GTM_ID && (
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
      )}
    </>
  )
}