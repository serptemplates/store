'use client';

import { Product } from '@/lib/schema';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { FAQ } from '@/components/FAQ';
import { CTA } from '@/components/CTA';
import { Footer } from '@/components/Footer';

// Sample product data - this would come from your JSON/database
const product: Product = {
  id: 1,
  created_at: "2025-01-23T00:00:00Z",
  name: "123movies Downloader",
  tagline: "Download content from 123movies instantly without ads or popups",
  description: "123movies Downloader is a powerful tool that helps you download content from 123movies instantly without ads or popups. Built with modern technologies, it provides a seamless experience for downloading and managing content.",
  seo_title: "123movies Downloader - Free Content Download Tool",
  seo_description: "https://serp.ly/123movies-downloader",
  featured_image: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=1200&h=600&fit=crop",
  features: [
    "Stream-to-file conversion",
    "HD quality downloads",
    "Batch download support",
    "Resume interrupted downloads",
    "No watermarks",
    "Content extraction"
  ],
  product_video: [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  ],
  related_videos: undefined,
  installation_instructions: `1. Clone the repository: git clone https://github.com/serpapps/123movies-downloader
2. Install dependencies
3. Configure settings
4. Run the application`,
  usage_instructions: [
    "Open the application",
    "Enter the URL of the content you want to download",
    "Select your preferred quality and format",
    "Click download to start the process",
    "Files will be saved to your specified directory"
  ],
  troubleshooting_instructions: [],
  faqs: [
    {
      question: "Is this tool safe to use?",
      answer: "Yes, this is a secure tool that runs locally on your machine. No data is sent to external servers."
    },
    {
      question: "What video formats are supported?",
      answer: "The tool supports most common video formats including MP4, AVI, MKV, and more."
    },
    {
      question: "Can I download multiple videos at once?",
      answer: "Yes, the tool supports batch downloads so you can queue multiple videos for download."
    },
    {
      question: "What happens if my download is interrupted?",
      answer: "The tool can resume interrupted downloads from where they left off, so you don't lose progress."
    }
  ],
  status: "live",
  version_number: 1,
  updated_at: "2025-01-23T00:00:00Z",
  github_repo_url: "https://github.com/serpapps/123movies-downloader",
  technologies: ["Python", "JavaScript", "Node.js", "Automation"],
  supported_operating_systems: ["windows", "macos", "linux"]
};

export default function ProductLanding() {
  const getVideoEmbed = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('watch?v=') 
        ? url.split('watch?v=')[1] 
        : url.split('youtu.be/')[1];
      return `https://www.youtube.com/embed/${videoId}?rel=0`;
    }
    return url;
  };

  return (
    <div className="min-h-screen">
      <Header product={product} />
      <Hero product={product} getVideoEmbed={getVideoEmbed} />
      <Features product={product} />
      <FAQ product={product} />
      <CTA product={product} />
      <Footer product={product} />
    </div>
  );
}