export const siteConfig = {
  name: "Loom Video Downloader",
  url: "https://getlooma.com",
  description: "Looma - the Loom Video Downloader | Looma is how you download Loom videos, audio, transcripts, mp4s, and more - on chrome, firefox, windows or mac.",
  title: "Loom Video Downloader",
  platform: "Loom",
  videoUrl: "https://www.youtube.com/watch?v=bbkhxMpIH4w",
  author: {
    name: "Mr Video Downloader",
    email: "contact@getlooma.com",
  },
  categories: [
    "Downloaders",
  ],
    buyUrl: "https://serp.ly/loom-video-downloader",
  githubLink: "https://github.com/serpcompany/getlooma.com",
  gtmId: "GTM-57L458CF",
  metadata: {
    keywords: ["Looma", "loom downloader", "loom video download", "loom mp4", "loom audio download", "loom transcript", "loom to mp4", "Looma chrome", "Looma firefox", "loom download windows", "loom download mac", "online loom downloader", "free loom download"],
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Looma",
    },
    twitter: {
      card: "summary_large_image",
      creator: "@",
    },
  },
} as const;

export type SiteConfig = typeof siteConfig;
