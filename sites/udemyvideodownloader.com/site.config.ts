export const siteConfig = {
  name: "Udemy Video Downloader",
  url: "https://udemyvideodownloader.com",
  description: "Download Udemy videos, audio, transcripts, mp4s, and more - on chrome, firefox, windows or mac.",
  title: "Udemy Video Downloader - Download Udemy videos, audio, transcripts & more",
  platform: "Udemy",
  videoUrl: "https://www.udemy.com/course/course-name/learn/lecture/12345678",
  author: {
    name: "Mr Video Downloader",
    email: "contact@udemyvideodownloader.com",
  },
  categories: [
    "Udemy Downloaders",
  ],
  buyUrl: "#download",
  githubLink: "https://github.com/serpcompany/udemyvideodownloader.com",
  gtmId: "GTM-KK3QGQTG",
  metadata: {
    keywords: ["download udemy", "udemy downloader", "udemy video download", "udemy mp4", "udemy audio download", "udemy transcript", "udemy to mp4", "udemy downloader chrome", "udemy downloader firefox", "udemy download windows", "udemy download mac", "online udemy downloader", "free udemy download"],
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Udemy Video Downloader",
    },
    twitter: {
      card: "summary_large_image",
      creator: "@",
    },
  },
} as const;

export type SiteConfig = typeof siteConfig;
