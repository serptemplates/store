import { describe, expect, it } from "vitest";

import { formatTrademarkDisclaimer, deriveTrademarkDomainLabel } from "@/lib/products/trademark";

describe("formatTrademarkDisclaimer", () => {
  it("returns null when the product does not reference a trademark", () => {
    const disclaimer = formatTrademarkDisclaimer({
      name: "Generic Downloader",
      trademark_metadata: {
        uses_trademarked_brand: false,
      },
    });

    expect(disclaimer).toBeNull();
  });

  it("builds the default disclaimer string when metadata is provided", () => {
    const disclaimer = formatTrademarkDisclaimer({
      name: "OnlyFans Downloader",
      trademark_metadata: {
        uses_trademarked_brand: true,
        trade_name: "OnlyFans",
        legal_entity: "Fenix International Limited",
      },
    });

    expect(disclaimer).toBe(
      "OnlyFans Downloader is an independent product not affiliated with or endorsed by OnlyFans, Fenix International Limited or any subsidiaries or affiliates. All trademarks are property of their respective owners and use of them does not imply affiliation or endorsement.",
    );
  });

  it("falls back to the trade name when the legal entity is not specified", () => {
    const disclaimer = formatTrademarkDisclaimer({
      name: "Circle Downloader",
      trademark_metadata: {
        uses_trademarked_brand: true,
        trade_name: "Circle",
      },
    });

    expect(disclaimer).toBe(
      "Circle Downloader is an independent product not affiliated with or endorsed by Circle or any subsidiaries or affiliates. All trademarks are property of their respective owners and use of them does not imply affiliation or endorsement.",
    );
  });

  it("hides placeholder legal entities like 'Unknown / no verifiable registrant'", () => {
    const disclaimer = formatTrademarkDisclaimer({
      name: "Beeg Video Downloader",
      trademark_metadata: {
        uses_trademarked_brand: true,
        trade_name: "Beeg",
        legal_entity: "Unknown / no verifiable registrant",
      },
    });

    expect(disclaimer).toBe(
      "Beeg Video Downloader is an independent product not affiliated with or endorsed by Beeg or any subsidiaries or affiliates. All trademarks are property of their respective owners and use of them does not imply affiliation or endorsement.",
    );
  });
});

describe("deriveTrademarkDomainLabel", () => {
  it("normalizes whitespace and punctuation when building the domain label", () => {
    expect(deriveTrademarkDomainLabel("Go High Level")).toBe("GoHighLevel.com");
    expect(deriveTrademarkDomainLabel("TikTok")).toBe("TikTok.com");
  });
});
