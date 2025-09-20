import { siteConfig } from "@/site.config";
import { getAllPosts } from "@/lib/blog";
import ClientHome from "./ClientHome";

export default function HomePage() {
  const posts = getAllPosts();
  return (
    <ClientHome
      platform={siteConfig.platform}
      videoUrl={siteConfig.videoUrl}
      heroTitle="Vimeo Video Downloader"
      heroDescription="Download Vimeo videos to your computer for offline watching from any webpage with this browser extension."
      ctaText="GET IT NOW"
      ctaHref={siteConfig.buyUrl}
      posts={posts}
      postsTitle="Posts"
      faqs={[
        {
          question: "Can I download a video from Vimeo?",
          answer:
            "Yes—if you own the video or have permission. Install our Vimeo Video Downloader extension, open the video page, click the extension, and save the MP4 in the available quality. Always respect creator rights and your organization’s policies.",
        },
        {
          question: "How to download non-downloadable Vimeo videos?",
          answer:
            "When Vimeo doesn’t show a download button, the extension scans the page for the active stream and offers a direct download (when you have access to view it). Open the video, click the extension, pick a quality (up to 4K when available), and download.",
        },
        {
          question: "How do I download a Vimeo video for offline viewing?",
          answer:
            "Use the browser extension: install it, visit the Vimeo page, press the extension, choose MP4/WebM and quality, and save the file. For long trips, batch videos you’re allowed to download and keep them organized by folder before going offline.",
        },
        {
          question: "What are the disadvantages of Vimeo?",
          answer:
            "Great quality and privacy controls, but downloads are often disabled by owners; links can expire; and large files buffer on slow networks. The extension helps by letting you save permitted videos locally so playback doesn’t depend on bandwidth.",
        },
        {
          question: "How to download Vimeo videos on iPhone?",
          answer:
            "On iPhone, use Safari with a file manager (e.g., Files app) or a desktop browser to download first, then AirDrop/Drive it to your phone. The extension runs on desktop Chrome-based browsers; once saved, transfer the MP4 to your iOS device.",
        },
        {
          question: "How to download Vimeo videos on Chrome?",
          answer:
            "Install the Vimeo Video Downloader, open any Vimeo page, click the extension icon, and choose the quality to save. It’s fast (no re‑encoding), preserves original quality, and adds no watermarks.",
        },
      ]}
      screenshots={[
        { src: "https://github.com/user-attachments/assets/884674e0-dfcb-4dc1-a0d3-fa29df51d55e", alt: "Vimeo Downloader Screenshot 1" },
        { src: "https://github.com/user-attachments/assets/8a317739-816a-446f-95d2-bd8b5aec63cc", alt: "Vimeo Downloader Screenshot 2" },
        { src: "https://github.com/user-attachments/assets/46c7dcda-c6a9-4036-895b-f34fb3c8f857", alt: "Vimeo Downloader Screenshot 3" },
        { src: "https://github.com/user-attachments/assets/6040ffdf-1f96-4d92-85c4-84474b769642", alt: "Vimeo Downloader Screenshot 4" },
        { src: "https://github.com/user-attachments/assets/fd7c71a8-7ec1-44f3-9522-c214f3667dc9", alt: "Vimeo Downloader Screenshot 5" },
      ]}
    />
  );
}
