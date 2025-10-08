import type { Route } from "next";

export type VideoSourceType = "primary" | "related";

export interface VideoListingItem {
  watchPath: Route;
  watchUrl: string;
  thumbnailUrl?: string;
  embedUrl: string;
  contentUrl: string;
  title: string;
  description: string;
  source: VideoSourceType;
  productName: string;
}
