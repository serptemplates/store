import type { ProductData } from "./product-schema";

export type ReleaseStatus = ProductData["status"];

const BADGE_TEXT: Record<ReleaseStatus, string> = {
  draft: "DRAFT",
  pre_release: "PRE-RELEASE",
  live: "LIVE",
};

export function getReleaseStatus(value: ProductData | ReleaseStatus | undefined): ReleaseStatus {
  if (!value) {
    return "draft";
  }
  if (typeof value === "string") {
    return value as ReleaseStatus;
  }
  return (value.status ?? "draft") as ReleaseStatus;
}

export function isPreRelease(value: ProductData | ReleaseStatus | undefined): boolean {
  return getReleaseStatus(value) === "pre_release";
}

export function isLive(value: ProductData | ReleaseStatus | undefined): boolean {
  return getReleaseStatus(value) === "live";
}

export function isDraft(value: ProductData | ReleaseStatus | undefined): boolean {
  return getReleaseStatus(value) === "draft";
}

export function getReleaseBadgeText(value: ProductData | ReleaseStatus | undefined): string {
  const status = getReleaseStatus(value);
  return BADGE_TEXT[status] ?? "LIVE";
}
