import "@testing-library/jest-dom/vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { DubAnalytics } from "@/components/analytics/DubAnalytics";

describe("DubAnalytics configuration", () => {
  const PUBLISHABLE_KEY = "dub_pk_test_123456";
  beforeEach(() => {
    vi.stubGlobal("React", React);
    process.env.NEXT_PUBLIC_DUB_PUBLISHABLE_KEY = PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_RUNTIME_ENV = "production";
    // Clean any previous script tags to get a clean slate
    document.head
      .querySelectorAll('script[data-sdkn="@dub/analytics"]')
      .forEach((el) => el.parentElement?.removeChild(el));
  });

  afterEach(() => {
    cleanup();
    delete process.env.NEXT_PUBLIC_DUB_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_RUNTIME_ENV;
  });

  it("injects the Dub script with correct attributes and domains config", async () => {
    render(<DubAnalytics />);

    const script = document.head.querySelector(
      'script[data-sdkn="@dub/analytics"]'
    ) as HTMLScriptElement | null;

    expect(script).toBeTruthy();
    expect(script?.getAttribute("data-publishable-key")).toBe(PUBLISHABLE_KEY);

    const domainsRaw = script?.getAttribute("data-domains");
    expect(domainsRaw).toBeTruthy();
    const domains = domainsRaw ? JSON.parse(domainsRaw) : {};

    // refer short domain for affiliate tracking
    expect(domains.refer).toBe("serp.cc");

    // outbound domains should include key Stripe and serp.co sites
    expect(domains.outbound).toEqual(
      expect.arrayContaining([
        "buy.stripe.com",
        "checkout.stripe.com",
        "billing.stripe.com",
        "apps.serp.co",
        "extensions.serp.co",
        "tools.serp.co",
        "store.serp.co",
        "serp.co",
      ])
    );

    // query params and cookie domain options
    expect(script?.getAttribute("data-query-params")).toBe(
      JSON.stringify(["via"]) 
    );

    expect(script?.getAttribute("data-cookie-options")).toBe(
      JSON.stringify({ domain: ".serp.co" })
    );

    // The script src should be the analytics script (features concatenated by the SDK)
    const src = script?.getAttribute("src") ?? "";
    expect(src).toContain("https://www.dubcdn.com/analytics/script");
  });

  it("skips loading Dub script outside production runtime", () => {
    process.env.NEXT_PUBLIC_RUNTIME_ENV = "development";
    render(<DubAnalytics />);
    const script = document.head.querySelector('script[data-sdkn="@dub/analytics"]');
    expect(script).toBeNull();
  });
});
