export const siteConfig = {
  name: "Wistia Video Downloader",
  url: "https://wistiadownloader.com",
  description: "Download Wistia videos, audio, transcripts, mp4s, and more - on chrome, firefox, windows or mac.",
  title: "Wistia Video Downloader",
  platform: "Wistia",
  videoUrl: "https://home.wistia.com/medias/e4a27b971d",
  author: {
    name: "Mr Video Downloader",
    email: "contact@wistiadownloader.com",
  },
  categories: [
    "Wistia Downloaders",
  ],
  buyUrl: "#download",
  githubLink: "https://github.com/serpcompany/wistiadownloader.com",
  gtmId: "GTM-MM67CMD4",
  metadata: {
    keywords: ["download wistia", "wistia downloader", "wistia video download", "wistia mp4", "wistia audio download", "wistia transcript", "wistia to mp4", "wistia downloader chrome", "wistia downloader firefox", "wistia download windows", "wistia download mac", "online wistia downloader", "free wistia download"],
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Wistia Video Downloader",
    },
    twitter: {
      card: "summary_large_image",
      creator: "@",
    },
  },
} as const;

export type SiteConfig = typeof siteConfig;
