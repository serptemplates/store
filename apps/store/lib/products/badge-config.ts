/**
 * Centralized rules for badge visibility and presentation tweaks.
 */

const NEW_RELEASE_BANNER_SLUGS = [
  "circle-downloader",
  "whop-video-downloader",
  "youtube-downloader",
] as const;

const newReleaseBannerSet = new Set<string>(NEW_RELEASE_BANNER_SLUGS);

export function shouldShowNewReleaseBanner(slug?: string | null): boolean {
  if (!slug) {
    return false;
  }
  return newReleaseBannerSet.has(slug);
}

export const NEW_RELEASE_BANNER_SLUGS_LIST = [...NEW_RELEASE_BANNER_SLUGS];
