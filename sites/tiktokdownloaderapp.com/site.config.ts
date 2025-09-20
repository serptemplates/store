export const siteConfig = {
  name: "TikTok Video Downloader",
  url: "https://tiktokdownloaderapp.com",
  description: "Download TikTok videos, audio, transcripts, mp4s, and more - on chrome, firefox, windows or mac.",
  title: "TikTok Video Downloader - Download TikTok videos, audio, transcripts & more",
  platform: "TikTok",
  videoUrl: "https://www.tiktok.com/@username/video/1234567890123456789",
  author: {
    name: "Mr Video Downloader",
    email: "contact@tiktokdownloaderapp.com",
  },
  categories: [
    "TikTok Downloaders",
  ],
  buyUrl: "#download",
  githubLink: "https://github.com/serpcompany/tiktokdownloaderapp.com",
  gtmId: "GTM-TQWJMC82",
  metadata: {
    keywords: ["download tiktok", "tiktok downloader", "tiktok video download", "tiktok mp4", "tiktok audio download", "tiktok transcript", "tiktok to mp4", "tiktok downloader chrome", "tiktok downloader firefox", "tiktok download windows", "tiktok download mac", "online tiktok downloader", "free tiktok download"],
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "TikTok Video Downloader",
    },
    twitter: {
      card: "summary_large_image",
      creator: "@",
    },
  },
} as const;

export type SiteConfig = typeof siteConfig;
