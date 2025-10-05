import { notFound } from "next/navigation";
import ClientHome from "../ClientHome";
import HybridPage from "./hybrid-page";
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar";
import { getAllPosts } from "@/lib/blog";
import { getAllProducts, getProductData, getProductSlugs } from "@/lib/product";
import { getSiteConfig } from "@/lib/site-config";
import { buildPrimaryNavProps } from "@/lib/navigation";

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
    <>
      <PrimaryNavbar {...navProps} />
      <ClientHome product={product} posts={posts} siteConfig={siteConfig} navProps={navProps} />
    </>
  );
}

export function generateStaticParams() {
  return getProductSlugs().map((slug) => ({ slug }));
}
