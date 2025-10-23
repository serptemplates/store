import { describe, expect, it } from "vitest";
import { isOpaqueScriptErrorEvent, shouldIgnoreThirdPartyError } from "@/lib/analytics/posthog";

describe("isOpaqueScriptErrorEvent", () => {
  it("returns true for generic script errors without additional context", () => {
    expect(
      isOpaqueScriptErrorEvent({
        message: "Script error.",
        filename: "",
        lineno: 0,
        colno: 0,
      }),
    ).toBe(true);
  });

  it("returns false when a filename is provided", () => {
    expect(
      isOpaqueScriptErrorEvent({
        message: "Script error.",
        filename: "checkout.js",
        lineno: 42,
        colno: 7,
      }),
    ).toBe(false);
  });

  it("returns false when the message differs", () => {
    expect(
      isOpaqueScriptErrorEvent({
        message: "Checkout failed",
        filename: "",
        lineno: 0,
        colno: 0,
      }),
    ).toBe(false);
  });
});

describe("shouldIgnoreThirdPartyError", () => {
  it("returns true for known Google Tag Manager console errors", () => {
    expect(
      shouldIgnoreThirdPartyError(
        {
          name: "ReferenceError",
          message: "getConsole is not defined",
          stack: "at https://www.googletagmanager.com/gtm.js?id=GTM-WS97TH45:599:23",
        },
        { url: "https://apps.serp.co/products/demo" },
      ),
    ).toBe(true);
  });

  it("returns false for application errors without third-party markers", () => {
    expect(
      shouldIgnoreThirdPartyError(
        {
          name: "TypeError",
          message: "Cannot read properties of undefined (reading 'productName')",
          stack: "at CheckoutPage (checkout/page.tsx:42:13)",
        },
        { url: "https://apps.serp.co/checkout/demo" },
      ),
    ).toBe(false);
  });
});
