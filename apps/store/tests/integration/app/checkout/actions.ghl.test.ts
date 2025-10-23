import { describe, expect, it } from "vitest";

import { processGhlPayment } from "@/app/checkout/success/actions";

describe("processGhlPayment", () => {
  it("builds conversion data from product slug when order is unavailable", async () => {
    const result = await processGhlPayment({ productSlug: "youtube-downloader" });

    expect(result.success).toBe(true);
    expect(result.order).toBeTruthy();
    expect(result.order?.sessionId).toMatch(/^ghl_youtube-downloader/);
    expect(result.order?.items?.[0]).toEqual(
      expect.objectContaining({
        id: "youtube-downloader",
        name: expect.stringContaining("Youtube"),
        quantity: 1,
      }),
    );
    expect(typeof result.order?.amount === "number").toBe(true);
  });
});
