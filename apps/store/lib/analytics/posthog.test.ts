import { describe, expect, it } from "vitest";
import { isOpaqueScriptErrorEvent } from "@/lib/analytics/posthog";

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
