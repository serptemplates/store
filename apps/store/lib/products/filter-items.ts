import { shouldShowNewReleaseBanner } from "./badge-config";
import { deriveProductCategories } from "./categories";
import type { ProductData } from "./product-schema";
import type { ReleaseStatus } from "./release-status";

export type ProductFilterItem = {
  slug: string;
  name: string;
  categories: string[];
  keywords: string[];
  platform?: string;
  status: ReleaseStatus;
  new_release?: boolean;
  popular?: boolean;
};

export function buildProductFilterItem(product: ProductData): ProductFilterItem {
  const categories = deriveProductCategories(product);
  const keywords = Array.from(
    new Set(
      [
        product.name,
        product.platform ?? "",
        ...(product.keywords ?? []),
        ...categories,
      ].filter(Boolean),
    ),
  );

  const displayNewRelease = Boolean(
    product.new_release && shouldShowNewReleaseBanner(product.slug),
  );

  return {
    slug: product.slug,
    name: product.name,
    categories,
    keywords,
    platform: product.platform,
    status: (product.status as ReleaseStatus) ?? "draft",
    new_release: displayNewRelease,
    popular: product.popular ?? false,
  };
}

export function buildProductFilterItems(products: ProductData[]): ProductFilterItem[] {
  return products.map((product) => buildProductFilterItem(product));
}
