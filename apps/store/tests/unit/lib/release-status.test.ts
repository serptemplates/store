import { describe, expect, it } from "vitest";

import { getReleaseBadgeText, getReleaseStatus, isDraft, isLive, isPreRelease } from "@/lib/products/release-status";

describe("release-status helpers", () => {
  it("derives status from string values", () => {
    expect(getReleaseStatus("pre_release")).toBe("pre_release");
    expect(isPreRelease("pre_release")).toBe(true);
    expect(isLive("pre_release")).toBe(false);
    expect(isDraft("pre_release")).toBe(false);
  });

  it("falls back to draft when status is missing", () => {
    expect(getReleaseStatus(undefined)).toBe("draft");
    expect(isPreRelease(undefined)).toBe(false);
    expect(isLive(undefined)).toBe(false);
    expect(isDraft(undefined)).toBe(true);
  });

  it("returns consistent badge text", () => {
    expect(getReleaseBadgeText("draft")).toBe("DRAFT");
    expect(getReleaseBadgeText("pre_release")).toBe("PRE-RELEASE");
    expect(getReleaseBadgeText("live")).toBe("LIVE");
  });
});
