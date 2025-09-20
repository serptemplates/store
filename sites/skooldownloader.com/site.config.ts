export const siteConfig = {
  name: "Skool Downloader",
  url: "https://skooldownloader.com",
  description: "Download Skool videos for offline viewing.",
  title: "Skool Video Downloader",
  platform: "Skool",
  videoUrl: "https://app.skool.com/example",
  author: {
    name: "Mr Video Downloader",
    email: "contact@skooldownloader.com",
  },
  categories: [
    "Downloaders",
  ],
  buyUrl: "#download",
  githubLink: "https://github.com/serpcompany/skooldownloader.com",
  gtmId: "GTM-W7GFBQ7G",
  metadata: {
    keywords: ["Skool", "skool downloader", "skool video download", "skool mp4", "skool audio download", "skool transcript", "skool to mp4", "skool downloader chrome", "skool downloader firefox", "skool download windows", "skool download mac", "online skool downloader", "free skool download"],
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Skool Video Downloader",
    },
    twitter: {
      card: "summary_large_image",
      creator: "@",
    },
  },
} as const;

export type SiteConfig = typeof siteConfig;
