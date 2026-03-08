import { describe, expect, it } from "vitest";

import { ensureSuccessUrlHasSessionPlaceholder, getOfferConfig } from "@/lib/products/offer-config";

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

  it("does not expose the all downloaders bundle as an optional item for downloader sales pages", () => {
    const offer = getOfferConfig("youtube-downloader");

    const optionalProductIds = (offer?.optionalItems ?? []).map((item) => item.product_id);
    expect(optionalProductIds).not.toContain("prod_TadNFo3sxzkGYb");
  });
});
