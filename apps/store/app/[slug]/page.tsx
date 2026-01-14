import { notFound } from "next/navigation";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar";
import { getAllPosts } from "@/lib/blog";
import { getAllProducts, getProductData, getProductSlugs } from "@/lib/products/product";
import { getSiteConfig } from "@/lib/site-config";
import { buildPrimaryNavProps } from "@/lib/navigation";
import { getProductVideoEntries } from "@/lib/products/video";
import { buildProductMetadata } from "@/lib/products/metadata";
import { formatTrademarkDisclaimer } from "@/lib/products/trademark";

// Lazy load heavy page components
const ClientHome = dynamic(() => import("../ClientHome"), {
  loading: () => <div className="min-h-screen" />,
  ssr: true, // Keep SSR for SEO
});

const MarketplacePage = dynamic(() => import("./marketplace-page"), {
  loading: () => <div className="min-h-screen" />,
  ssr: true,
});

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const available = new Set(getProductSlugs());

  if (!available.has(slug)) {
    notFound();
  }

  const product = getProductData(slug);
  const posts = getAllPosts();
  const siteConfig = getSiteConfig();
  const allProducts = getAllProducts();
  const navProps = buildPrimaryNavProps({ products: allProducts, siteConfig });
  const videoEntries = getProductVideoEntries(product);

  // Marketplace layout is used for pre-release products.
  const shouldUseMarketplaceLayout = product.status === "pre_release";

  if (shouldUseMarketplaceLayout) {
    return (
      <>
        <PrimaryNavbar {...navProps} />
        <MarketplacePage product={product} siteConfig={siteConfig} />
      </>
    );
  }

  // Default to landing page layout
  return (
    <ClientHome
      product={product}
      posts={posts}
      siteConfig={siteConfig}
      navProps={navProps}
      videoEntries={videoEntries}
      trademarkNotice={formatTrademarkDisclaimer(product)}
    />
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const available = new Set(getProductSlugs());
  if (!available.has(slug)) {
    return {};
  }
  const product = getProductData(slug);
  const siteConfig = getSiteConfig();
  return buildProductMetadata(product, { baseUrl: siteConfig.site?.domain });
}

export function generateStaticParams() {
  return getProductSlugs().map((slug) => ({ slug }));
}
