import type { Route } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductVideoEntry } from "@/lib/products/video";

type MockProduct = { slug: string; name: string };

const mockProducts: MockProduct[] = [];
const mockVideoEntries = new Map<string, ProductVideoEntry[]>();

vi.mock("@/lib/products/product", () => ({
  getAllProducts: () => mockProducts,
}));

vi.mock("@/lib/products/video", () => ({
  getProductVideoEntries: (product: MockProduct) =>
    mockVideoEntries.get(product.slug) ?? [],
}));

vi.mock("@/lib/sitemap-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sitemap-utils")>(
    "@/lib/sitemap-utils",
  );

  return {
    ...actual,
    resolveBaseUrl: () => "https://example.com",
  };
});

describe("videos sitemap generator", () => {
  beforeEach(() => {
    vi.resetModules();
    mockProducts.length = 0;
    mockVideoEntries.clear();
  });

  it("uses embed URLs for player_loc without duplicating watch URLs", async () => {
    mockProducts.push({ slug: "tool-a", name: "Tool A" });
    mockVideoEntries.set("tool-a", [
      {
        slug: "primary-video",
        url: "https://www.youtube.com/watch?v=ABCDEFGHIJK",
        embedUrl: "https://www.youtube-nocookie.com/embed/ABCDEFGHIJK?rel=0",
        watchPath: "/watch/tool-a/primary-video" as Route,
        title: "Tool A Overview",
        description: "Walkthrough",
        thumbnailUrl: "https://img.youtube.com/vi/ABCDEFGHIJK/maxresdefault.jpg",
        platform: "youtube",
        uploadDate: "2024-09-01T10:00:00Z",
        duration: "PT2M30S",
        source: "primary",
      },
    ]);

    const { GET } = await import("@/app/videos-sitemap.xml/route");
    const response = GET();
    const xml = await response.text();

    expect(xml).toContain(
      "<loc>https://example.com/watch/tool-a/primary-video</loc>",
    );
    expect(xml).toContain(
      "<video:player_loc allow_embed=\"yes\">https://www.youtube-nocookie.com/embed/ABCDEFGHIJK?rel=0</video:player_loc>",
    );
    expect(xml).not.toContain(
      "<video:player_loc allow_embed=\"yes\">https://example.com/watch/tool-a/primary-video</video:player_loc>",
    );
    expect(xml).not.toContain(
      "<video:content_loc>https://example.com/watch/tool-a/primary-video</video:content_loc>",
    );
  });

  it("emits content_loc for direct video files and omits duplicate player_loc tags", async () => {
    mockProducts.push({ slug: "tool-b", name: "Tool B" });
    mockVideoEntries.set("tool-b", [
      {
        slug: "downloadable-video",
        url: "https://cdn.serp.co/videos/tool-b-demo.mp4?cache=bust",
        embedUrl: "https://cdn.serp.co/videos/tool-b-demo.mp4?cache=bust",
        watchPath: "/watch/tool-b/downloadable-video" as Route,
        title: "Tool B Demo",
        description: "Demo video",
        platform: "unknown",
        source: "primary",
      },
    ]);

    const { GET } = await import("@/app/videos-sitemap.xml/route");
    const response = GET();
    const xml = await response.text();

    expect(xml).toContain(
      "<video:content_loc>https://cdn.serp.co/videos/tool-b-demo.mp4?cache=bust</video:content_loc>",
    );
    expect(xml).not.toContain(
      "<video:player_loc allow_embed=\"yes\">https://cdn.serp.co/videos/tool-b-demo.mp4</video:player_loc>",
    );
  });
});
