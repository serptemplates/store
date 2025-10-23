import { describe, expect, it } from "vitest";
import type { Route } from "next";

import { buildVideoListSchema } from "@/app/videos/schema";
import type { VideoListingItem } from "@/app/videos/types";

describe("buildVideoListSchema", () => {
  it("includes uploadDate in each VideoObject when provided", () => {
    const items: VideoListingItem[] = [
      {
        watchPath: "/watch/sample/primary" as Route,
        watchUrl: "https://apps.serp.co/watch/sample/primary",
        thumbnailUrl: "https://cdn.serp.co/sample.jpg",
        embedUrl: "https://player.serp.co/embed/sample",
        contentUrl: "https://cdn.serp.co/video.mp4",
        title: "Sample Video",
        description: "Demo video",
        source: "primary",
        productName: "Sample Product",
        uploadDate: "2025-01-01T00:00:00.000Z",
      },
    ];

    const schema = buildVideoListSchema(items, "SERP Apps", "https://apps.serp.co");

    expect(schema.itemListElement[0].item.uploadDate).toBe("2025-01-01T00:00:00.000Z");
  });
});
