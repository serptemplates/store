import { siteConfig } from "@/site.config";
import { getAllPosts } from "@/lib/blog";
import ClientHome from "./ClientHome";

export default function HomePage() {
  const posts = getAllPosts();
  return (
    <ClientHome
      platform={siteConfig.platform}
      videoUrl={siteConfig.videoUrl}
      heroVideoTitle="Download Loom Videos"
      ctaText="TRY FOR FREE"
      ctaHref="https://serp.ly/loom-video-downloader"
      posts={posts}
      postsTitle="Posts"
      testimonialsHeading="Reviews"
      testimonials={[
        {
          id: 1,
          name: "Jonas H.",
          testimonial:
            "Agreed, this downloader is great. Would be even greater if there was a way to download a module or classroom all at once, instead of one video at a time.",
        },
        {
          id: 2,
          name: "Marcos P.",
          testimonial:
            "Hey Devin — thanks for creating the downloader, it's amazing! I'm curious if there's a way to download a whole classroom module at once?",
        },
        {
          id: 3,
          name: "@rickgick5558",
          testimonial:
            "Thanks bro for your extension, it works great and actually saves my sanity — no need to mess around with tokens or random commands. Always a pleasure supporting talented devs like you.",
        },
      ]}
      faqs={[
        {
          question: "How to download a video from Loom for free?",
          answer:
            "Use Looma. Copy your Loom link, paste it into Looma, choose MP4/WEBM or audio, and download — no extension required. Only save content you own or have permission to download.",
        },
        {
          question: "How to download Loom videos with Chrome extension?",
          answer:
            "You don’t need an extension. Looma works in your browser: paste the Loom link, pick a quality, and download. This avoids extension conflicts and admin restrictions while keeping things simple.",
        },
        {
          question: "How long do Loom videos last?",
          answer:
            "Recording length depends on your Loom plan and workspace settings. Videos hosted on Loom stay available unless deleted or removed by retention policies. If you need a permanent offline copy, download with Looma and back it up.",
        },
        {
          question: "What is the alternative to Loom?",
          answer:
            "If your goal is saving or sharing Loom content offline, use Looma to export MP4/audio. For recording/creation needs, choose any screen recorder your team supports; Looma complements them by handling downloads when you need files.",
        },
        {
          question: "How to copy a Loom video?",
          answer:
            "To duplicate inside Loom, open the video, click ··· and choose ‘Duplicate’. To keep a local copy, use Looma: paste the Loom link, download the MP4, then share or re‑upload wherever you need (Drive, LMS, etc.).",
        },
        {
          question: "How do I download Loom videos to Google Drive?",
          answer:
            "Download with Looma as MP4, then upload the file to Google Drive (drag-and-drop or New → File upload). For recurring workflows, create a Drive folder and drop your Looma downloads there.",
        },
        {
          question: "Can you download someone else's Loom video?",
          answer:
            "Only when you have rights or explicit permission. If you can view and are allowed to download, paste the link into Looma to save a copy. Respect copyrights and your organization’s policies.",
        },
        {
          question: "Why can't I download my video on Loom?",
          answer:
            "Common causes: the video is still processing, you’re not the owner, or workspace policies disable downloads. As a workaround, paste the link into Looma to export an MP4/audio, or verify ownership and permissions in Loom.",
        },
      ]}
      pricing={{
        heading: "GET IT NOW",
        subheading: "",
        priceLabel: "",
        price: "$17",
        priceNote: "Pay once. Use free forever.",
        enabled: true,
        id: "pricing",
      }}
      screenshots={[
        { src: "/screenshots/loom-downloader-screenshot-1.jpg", alt: "Loom Downloader 1" },
        { src: "/screenshots/loom-downloader-screenshot-2.jpg", alt: "Loom Downloader 2" },
        { src: "/screenshots/loom-downloader-screenshot-3.jpg", alt: "Loom Downloader 3" },
      ]}
    />
  );
}
