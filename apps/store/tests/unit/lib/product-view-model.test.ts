import { describe, expect, it } from "vitest";

import { buildPermissionEntries, buildProductCopy, buildProductMetadata } from "@/lib/products/view-model";
import { createTestProduct } from "../lib/google-merchant/test-utils";

const baseProduct = createTestProduct({
  permission_justifications: [
    {
      permission: "downloads",
      justification: "Required to save files",
      learn_more_url: "https://example.com/permissions",
    },
  ],
  description: "Paragraph one.\n\nParagraph two.",
  tagline: "Demo tagline",
  seo_description: "SEO copy",
  features: [],
  related_posts: [],
  product_videos: [],
  related_videos: [],
  pricing: {
    label: "One-time payment",
    price: "$17.00",
    benefits: [],
  },
  faqs: [],
  reviews: [],
  screenshots: [],
  categories: ["Video Downloader", " Utilities "],
  supported_operating_systems: ["macOS", "windows"],
});

describe("product view-model helpers", () => {
  it("buildPermissionEntries normalises fields and preserves learn more URLs", () => {
    const entries = buildPermissionEntries(baseProduct);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: expect.stringContaining("permission"),
      question: "downloads",
      answer: "Required to save files",
      learnMoreUrl: "https://example.com/permissions",
    });
  });

  it("buildProductCopy splits description paragraphs and falls back to tagline", () => {
    const copy = buildProductCopy(baseProduct);
    expect(copy.aboutParagraphs).toEqual(["Paragraph two."]);
    expect(copy.subtitle).toBe("Demo tagline");
    expect(copy.featuresDescription).toBe("Paragraph one.");
  });

  it("buildProductMetadata collects categories, languages, and operating systems", () => {
    const metadataSource = {
      ...baseProduct,
      supported_languages: ["English", " Spanish " ],
    } as typeof baseProduct & { supported_languages: string[] };

    const metadata = buildProductMetadata(metadataSource);

    expect(metadata.categories).toEqual(["Video Downloader", "Utilities"]);
    expect(metadata.supportedLanguages).toEqual(["English", "Spanish"]);
    expect(metadata.operatingSystems).toEqual(["macOS", "windows"]);
  });
});
