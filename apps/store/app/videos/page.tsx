import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

import { getAllProducts } from "@/lib/product";
import { getProductVideoEntries } from "@/lib/video";
import { getSiteConfig } from "@/lib/site-config";
import { getSiteBaseUrl } from "@/lib/urls";
import { Footer as FooterComposite } from "@repo/ui/composites/Footer";
import { SiteNavbar } from "@repo/ui/composites/SiteNavbar";

import VideoLibraryShell from "./VideoLibraryShell";
import type { VideoListingItem } from "./types";

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
  const navbarCategories = (siteConfig.navigation?.links ?? [])
    .map((link) => link.label)
    .filter((label): label is string => Boolean(label));
  const logoSrc = siteConfig.site?.logo ?? "/logo.png";
  const ctaHref = siteConfig.cta?.href;
  const ctaText = siteConfig.cta?.text ?? "Shop Tools";

  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${siteName} Video Library`,
    itemListElement: sortedItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.watchUrl,
      item: {
        '@type': 'VideoObject',
        name: item.title,
        description: item.description,
        url: item.watchUrl,
        embedUrl: item.embedUrl,
        contentUrl: item.contentUrl,
        thumbnailUrl: item.thumbnailUrl,
        publisher: {
          '@type': 'Organization',
          name: siteName,
          logo: {
            '@type': 'ImageObject',
            url: `${baseUrl}/logo.png`,
          },
        },
      },
    })),
  };

  const filters = Array.from(new Set(sortedItems.map((item) => item.productName))).slice(0, 12);

  return (
    <>
      <SiteNavbar
        site={{ name: siteName, categories: navbarCategories, buyUrl: ctaHref }}
        Link={Link}
        brandSrc={logoSrc}
        showLinks={Boolean(navbarCategories.length)}
        showCta={Boolean(ctaHref)}
        ctaText={ctaText}
        ctaHref={ctaHref}
      />
      <main className="min-h-screen bg-[#f9f9f9] text-[#0f0f0f]">
        <Script id="videos-itemlist" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }} />
        <VideoLibraryShell siteName={siteName} filters={filters} videos={sortedItems} />
      </main>
      <FooterComposite site={{ name: siteName }} />
    </>
  );
}
