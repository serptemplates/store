import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ClientHome from "../ClientHome";
import HybridPage from "./hybrid-page";
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar";
import { getAllPosts } from "@/lib/blog";
import { getAllProducts, getProductData, getProductSlugs } from "@/lib/products/product";
import { getSiteConfig } from "@/lib/site-config";
import { buildPrimaryNavProps } from "@/lib/navigation";
import { getProductVideoEntries } from "@/lib/products/video";
import { buildProductMetadata } from "@/lib/products/metadata";

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

  // Check for layout_type in product
  const layoutType = product.layout_type || 'landing';

  if (layoutType === 'ecommerce') {
    return (
      <>
        <PrimaryNavbar {...navProps} />
        <HybridPage product={product} posts={posts} siteConfig={siteConfig} />
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
    />
  );
}

export function generateStaticParams() {
  return getProductSlugs().map((slug) => ({ slug }));
}

const FALLBACK_METADATA: Metadata = {
  title: "SERP Apps",
  description: "Browse the full catalog of SERP products.",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = getProductData(slug);
    return buildProductMetadata(product);
  } catch {
    return FALLBACK_METADATA;
  }
}
