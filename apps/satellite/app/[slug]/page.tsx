import { notFound } from "next/navigation";
import ClientHome from "../ClientHome";
import { getAllPosts } from "@/lib/blog";
import { getProductData, getProductSlugs } from "@/lib/product";
import { getSiteConfig } from "@/lib/site-config";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const available = new Set(getProductSlugs());

  if (!available.has(slug)) {
    notFound();
  }

  const product = getProductData(slug);
  const posts = getAllPosts();
  const siteConfig = getSiteConfig();

  return <ClientHome product={product} posts={posts} siteConfig={siteConfig} />;
}

export function generateStaticParams() {
  return getProductSlugs().map((slug) => ({ slug }));
}
