export const siteConfig = {
  name: "Vimeo Video Downloader",
  url: "https://downloadvimeo.com",
  description: "Download Vimeo videos, audio, transcripts, mp4s, and more - on chrome, firefox, windows or mac.",
  title: "Vimeo Video Downloader",
  platform: "Vimeo",
  videoUrl: "https://www.youtube.com/watch?v=-_zu7XgFuKs",
  author: {
    name: "Mr Video Downloader",
    email: "contact@serp.co.com",
  },
  categories: [
    "Vimeo Downloaders",
  ],
  buyUrl: "https://serp.ly/vimeo-video-downloader",
  githubLink: "https://github.com/serpcompany/downloadvimeo.com",
  gtmId: "GTM-PLDR624X",
  metadata: {
    keywords: ["download vimeo", "vimeo downloader", "vimeo video download", "vimeo mp4", "vimeo audio download", "vimeo transcript", "vimeo to mp4", "download vimeo chrome", "download vimeo firefox", "vimeo download windows", "vimeo download mac", "online vimeo downloader", "free vimeo download"],
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Download Vimeo",
    },
    twitter: {
      card: "summary_large_image",
      creator: "@",
    },
  },
} as const;

export type SiteConfig = typeof siteConfig;
