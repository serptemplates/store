import { MarketplaceProductPageView, type MarketplaceProductPageViewProps, type VideoCardItem } from "@/components/product/pages/MarketplaceProductPageView";
import { getProductVideoEntries } from "@/lib/products/video";

export type MarketplacePageProps = MarketplaceProductPageViewProps;

export default function MarketplacePage({ product, siteConfig }: MarketplaceProductPageViewProps) {
  const videoEntries: VideoCardItem[] = getProductVideoEntries(product).map((entry) => ({
    url: entry.url,
    title: entry.title,
    thumbnail: entry.thumbnailUrl ?? product.featured_image ?? null,
  }));

  return (
    <MarketplaceProductPageView
      product={product}
      siteConfig={siteConfig}
      videoEntries={videoEntries}
    />
  );
}
