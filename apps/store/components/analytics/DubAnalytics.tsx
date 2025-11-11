"use client";

import { Analytics as DubAnalyticsLib } from "@dub/analytics/react";

// Centralized Dub Analytics client component
// Configure client-side click tracking with our Dub short link domain
export function DubAnalytics() {
  const publishableKey = process.env.NEXT_PUBLIC_DUB_PUBLISHABLE_KEY;
  const runtimeHint =
    process.env.NEXT_PUBLIC_RUNTIME_ENV
    ?? process.env.RUNTIME_ENV
    ?? process.env.APP_ENV
    ?? process.env.VERCEL_ENV
    ?? process.env.NODE_ENV
    ?? "development";
  const isProductionRuntime = runtimeHint.trim().toLowerCase() === "production";

  const shouldLoadDub = Boolean(publishableKey && isProductionRuntime);

  if (!shouldLoadDub) {
    if (process.env.NODE_ENV !== "production") {
      const reason = publishableKey
        ? `runtime "${runtimeHint}" is not production`
        : "NEXT_PUBLIC_DUB_PUBLISHABLE_KEY is not set";
      // eslint-disable-next-line no-console
      console.warn(`[DubAnalytics] Skipping Dub initialization: ${reason}.`);
    }
    return null;
  }

  // publishableKey is defined if shouldLoadDub is true

  return (
    <DubAnalyticsLib
      publishableKey={publishableKey}
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
