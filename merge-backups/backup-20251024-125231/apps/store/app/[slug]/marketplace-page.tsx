<<<<<<< HEAD
import { MarketplaceProductPageView, type MarketplaceProductPageViewProps, type VideoCardItem } from "@/components/product/pages/MarketplaceProductPageView";
import { getAllProducts } from "@/lib/products/product";
import { getAllPosts } from "@/lib/blog";
import { productToHomeTemplate } from "@/lib/products/product-adapter";
import { getProductVideoEntries } from "@/lib/products/video";
import type { ProductData } from "@/lib/products/product-schema";

export type MarketplacePageProps = MarketplaceProductPageViewProps;

function computeRelatedApps(current: ProductData) {
  const all = getAllProducts();
  const currentSlug = current.slug?.trim();
  const currentCategories = new Set((current.categories ?? []).map((c) => c.toLowerCase()));
  const currentKeywords = new Set((current.keywords ?? []).map((k) => k.toLowerCase()));

  const scored = all
    .filter((p) => p.slug !== currentSlug)
    .map((p) => {
      const categories = new Set((p.categories ?? []).map((c) => c.toLowerCase()));
      const keywords = new Set((p.keywords ?? []).map((k) => k.toLowerCase()));
      let score = 0;
      categories.forEach((c) => {
        if (currentCategories.has(c)) score += 2;
      });
      keywords.forEach((k) => {
        if (currentKeywords.has(k)) score += 1;
      });
      return { slug: p.slug, name: p.name, primaryCategory: p.categories?.[0], score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return scored.slice(0, 6);
}

export default function MarketplacePage({ product, siteConfig }: MarketplaceProductPageViewProps) {
  const videoEntries: VideoCardItem[] = getProductVideoEntries(product).map((entry) => ({
    url: entry.url,
    title: entry.title,
    thumbnail: entry.thumbnailUrl ?? product.featured_image ?? null,
  }));
  const schemaVideoEntries = getProductVideoEntries(product);
  const relatedApps = computeRelatedApps(product);
  const allPosts = getAllPosts();
  const home = productToHomeTemplate(product, allPosts);
  const schemaPosts = home.posts && home.posts.length
    ? allPosts.filter((p) => home.posts!.some((hp) => hp.slug === p.slug))
    : [];

  return (
    <MarketplaceProductPageView
      product={product}
      siteConfig={siteConfig}
      videoEntries={videoEntries}
      schemaVideoEntries={schemaVideoEntries}
      relatedApps={relatedApps}
      relatedPosts={home.posts ?? []}
      schemaPosts={schemaPosts}
    />
  );
}
=======
"use client";

export { MarketplaceProductPageView as default } from "@/components/product/pages/MarketplaceProductPageView";
export type { MarketplaceProductPageViewProps as MarketplacePageProps } from "@/components/product/pages/MarketplaceProductPageView";

>>>>>>> origin/staging
