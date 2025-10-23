import type { Metadata } from "next";
import Script from "next/script";

import { getAllProducts } from "@/lib/products/product";
import { getProductVideoEntries } from "@/lib/products/video";
import { getSiteConfig } from "@/lib/site-config";
import { getSiteBaseUrl } from "@/lib/urls";
import { buildPrimaryNavProps } from "@/lib/navigation";
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar";
import { Footer as FooterComposite } from "@repo/ui/composites/Footer";

import { ProductBreadcrumb } from "@/components/product/ProductBreadcrumb";

import VideoLibraryShell from "./VideoLibraryShell";
import type { VideoListingItem } from "./types";
import { buildVideoListSchema } from "./schema";

export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = getSiteConfig();
  const baseUrl = getSiteBaseUrl();
  const siteName = siteConfig.site?.name ?? "SERP Apps";

  return {
    title: `${siteName} Video Library`,
    description: `Browse every product walkthrough and related demo video from ${siteName} in one place to see each tool in action before you buy.`,
    alternates: {
      canonical: `${baseUrl}/videos`,
    },
    openGraph: {
      type: "website",
      title: `${siteName} Video Library`,
      description: `All ${siteName} product demos and related videos, organized for quick preview and discovery.`,
      url: `${baseUrl}/videos`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} Video Library`,
      description: `SERP Apps Video Library`,
    },
  };
}

export default function VideosPage() {
  const siteConfig = getSiteConfig();
  const baseUrl = getSiteBaseUrl();
  const products = getAllProducts();

  const videoItems: VideoListingItem[] = products.flatMap((product) => {
    const entries = getProductVideoEntries(product);
    return entries.map((entry) => ({
      watchPath: entry.watchPath,
      watchUrl: `${baseUrl}${entry.watchPath}`,
      thumbnailUrl: entry.thumbnailUrl || product.featured_image || product.featured_image_gif || undefined,
      embedUrl: entry.embedUrl,
      contentUrl: entry.url,
      title: entry.title,
      description: entry.description,
      source: entry.source,
      productName: product.name,
      uploadDate: entry.uploadDate,
    }));
  });

  const sortedItems = videoItems.sort((a, b) => {
    const nameCompare = a.productName.localeCompare(b.productName);
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return a.title.localeCompare(b.title);
  });

  const siteName = siteConfig.site?.name ?? "SERP Apps";
  const navProps = buildPrimaryNavProps({ products, siteConfig });

  const listSchema = buildVideoListSchema(sortedItems, siteName, baseUrl);

  return (
    <>
      <PrimaryNavbar {...navProps} />
      <main className="min-h-screen bg-[#f9f9f9] text-[#0f0f0f]">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6">
          <ProductBreadcrumb
            className="text-xs text-muted-foreground"
            items={[
              { label: "Home", href: "/" },
              { label: `Videos` },
            ]}
          />
        </div>
        <Script id="videos-itemlist" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }} />
        <VideoLibraryShell videos={sortedItems} />
      </main>
      <FooterComposite site={{ name: "SERP", url: "https://serp.co" }} />
    </>
  );
}
