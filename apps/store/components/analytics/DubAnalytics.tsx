"use client";

import { Analytics as DubAnalyticsLib } from "@dub/analytics/react";
import { resolveDubConfig } from "@/lib/analytics/runtime-config";

// Centralized Dub Analytics client component
// Configure client-side click tracking with our Dub short link domain
export function DubAnalytics() {
  const dubConfig = resolveDubConfig();

  if (!dubConfig.enabled) {
    if (process.env.NODE_ENV !== "production") {
      const reason = dubConfig.publishableKey
        ? `runtime "${dubConfig.runtimeHint}" is not production`
        : "NEXT_PUBLIC_DUB_PUBLISHABLE_KEY is not set";
      // eslint-disable-next-line no-console
      console.warn(`[DubAnalytics] Skipping Dub initialization: ${reason}.`);
    }
    return null;
  }

  if (!dubConfig.conversionTrackingEnabled) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error(
        "[DubAnalytics] Skipping Dub initialization: conversion tracking is disabled (e.g. missing NEXT_PUBLIC_DUB_PUBLISHABLE_KEY)."
      );
    }
    return null;
  }

  return (
    <DubAnalyticsLib
      publishableKey={dubConfig.publishableKey ?? undefined}
      cookieOptions={{ domain: ".serp.co" }}
      queryParams={["via"]}
      domainsConfig={{
        // Short link domain used on Dub for this partner program
        refer: "serp.cc",
        // Outbound domains to track (checkout + brand sites)
        outbound: [
          "buy.stripe.com",
          "checkout.stripe.com",
          "billing.stripe.com",
          "apps.serp.co",
          "extensions.serp.co",
          "tools.serp.co",
          "store.serp.co",
          "serp.co",
        ],
      }}
    />
  );
}
