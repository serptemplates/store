import { describe, expect, it } from "vitest";

import { getCategoryBadgeClasses } from "@/components/category-badge";

describe("getCategoryBadgeClasses", () => {
  it("always includes the base pill styling", () => {
    const classes = getCategoryBadgeClasses("Downloader");
    expect(classes).toContain("inline-flex");
    expect(classes).toContain("rounded-full");
    expect(classes).toContain("px-3");
    expect(classes).toContain("py-1");
    expect(classes).toContain("font-medium");
  });

  it("maps known synonyms to the downloader palette", () => {
    const downloader = getCategoryBadgeClasses("Downloader");
    expect(getCategoryBadgeClasses("Video Downloader")).toBe(downloader);
    expect(getCategoryBadgeClasses("video downloader")).toBe(downloader);
  });

  it("supports audio related categories with dedicated styling", () => {
    const audio = getCategoryBadgeClasses("Audio");
    expect(audio).toContain("bg-[#e6f3ff]");
    expect(getCategoryBadgeClasses(" audio production ")).toBe(audio);
    expect(getCategoryBadgeClasses("music")).toBe(audio);
  });

  it("applies additional palette mappings for file storage and comics", () => {
    expect(getCategoryBadgeClasses("File Storage")).toContain("bg-[#eafcf4]");
    expect(getCategoryBadgeClasses("Comics")).toContain("bg-[#fff3e6]");
  });

  it("falls back to the default palette for unknown categories", () => {
    const classes = getCategoryBadgeClasses("Completely Unknown");
    expect(classes).toContain("bg-[#f6f8fa]");
    expect(classes).toContain("text-[#2f363d]");
  });
});
