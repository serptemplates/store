import type { VideoListingItem } from "./types";

export function buildVideoListSchema(items: VideoListingItem[], siteName: string, baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${siteName} Video Library`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: item.watchUrl,
      item: {
        "@type": "VideoObject",
        name: item.title,
        description: item.description,
        url: item.watchUrl,
        embedUrl: item.embedUrl,
        contentUrl: item.contentUrl,
        thumbnailUrl: item.thumbnailUrl,
        ...(item.uploadDate ? { uploadDate: item.uploadDate } : {}),
        publisher: {
          "@type": "Organization",
          name: siteName,
          logo: {
            "@type": "ImageObject",
            url: `${baseUrl}/logo.svg`,
          },
        },
      },
    })),
  } as const;
}
