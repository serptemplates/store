"use client"

import { GoogleTagManager } from "@next/third-parties/google"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {/* Load GTM only if configured */}
      {process.env.NEXT_PUBLIC_GTM_ID && (
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
      )}
    </>
  )
}
