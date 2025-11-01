"use client";

import { Analytics as DubAnalyticsLib } from "@dub/analytics/react";

// Centralized Dub Analytics client component
// Configure client-side click tracking with our Dub short link domain
export function DubAnalytics() {
  return (
    <DubAnalyticsLib
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
