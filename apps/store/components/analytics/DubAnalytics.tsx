"use client";

import { Analytics as DubAnalyticsLib } from "@dub/analytics/react";

// Centralized Dub Analytics client component
// Configure client-side click tracking with our Dub short link domain
export function DubAnalytics() {
  const publishableKey = process.env.NEXT_PUBLIC_DUB_PUBLISHABLE_KEY;

  // If no key is configured, do not render the analytics client
  if (!publishableKey) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[DubAnalytics] NEXT_PUBLIC_DUB_PUBLISHABLE_KEY is not set; skipping Dub initialization.");
    }
    return null;
  }

  return (
    <DubAnalyticsLib
      publishableKey={publishableKey}
      cookieOptions={{ domain: ".serp.co" }}
      queryParams={["via", "dub_id"]}
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
