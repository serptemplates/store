"use client";

import { GoogleTagManager, GoogleAnalytics, FacebookPixel } from "./gtm";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GoogleTagManager />
      <GoogleAnalytics />
      <FacebookPixel />
      {children}
    </>
  );
}