import { describe, expect, it } from "vitest";

import { ensureSuccessUrlHasSessionPlaceholder } from "@/lib/products/offer-config";

describe("ensureSuccessUrlHasSessionPlaceholder", () => {
  it("appends the placeholder when absent and no query parameters are present", () => {
    const result = ensureSuccessUrlHasSessionPlaceholder("https://apps.serp.co/checkout/success");

    expect(result).toBe("https://apps.serp.co/checkout/success?session_id={CHECKOUT_SESSION_ID}");
  });

  it("appends the placeholder using an ampersand when a query already exists", () => {
    const result = ensureSuccessUrlHasSessionPlaceholder(
      "https://apps.serp.co/checkout/success?product=demo",
    );

    expect(result).toBe(
      "https://apps.serp.co/checkout/success?product=demo&session_id={CHECKOUT_SESSION_ID}",
    );
  });

  it("returns the original URL when the placeholder is already present", () => {
    const url = "https://apps.serp.co/checkout/success?session_id={CHECKOUT_SESSION_ID}";

    expect(ensureSuccessUrlHasSessionPlaceholder(url)).toBe(url);
  });
});
