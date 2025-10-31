import type { ReleaseStatus } from "./release-status";
import { normalizeProductAssetPath } from "./asset-paths";
import { getAllProducts } from "./product";
import type { ProductData } from "./product-schema";

export interface ProductMetadata {
  platform?: string;
  seo_title?: string;
  seo_description?: string;
  github_repo_url?: string;
  stripe_price_id?: string;
  original_price?: string;
  benefits?: string[];
  features?: string[];
  [key: string]: unknown;
}

export interface Product {
  id: string
  title: string
  handle: string
  description?: string
  thumbnail?: string
  images?: Array<{ url: string }>
  status: ReleaseStatus
  new_release?: boolean
  popular?: boolean
  variants: Array<{
    id: string
    title: string
    prices: Array<{
      amount: number
      currency_code: string
    }>
    inventory_quantity?: number
  }>
  metadata?: ProductMetadata
  collection?: string
}

export async function getProducts(): Promise<Product[]> {
  const products = getAllProducts().map((data) => toProduct(data));
  return products;
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  const products = await getProducts()
  return products.find(p => p.handle === handle) || null
}

export async function getProductsByCollection(collection: string): Promise<Product[]> {
  const products = await getProducts()
  if (collection === 'all') return products
  return products.filter(p => p.collection === collection)
}

function parsePrice(priceString?: string): number {
  if (!priceString) return 0
  const price = parseFloat(priceString.replace(/[$,]/g, ''))
  return Math.round(price * 100)
}

export function formatPrice(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amount / 100)
}

function toProduct(data: ProductData): Product {
  const slug = data.slug.toLowerCase();

  let collection: string = "all";
  if (slug.includes("video") || slug.includes("downloader")) {
    collection = "video-downloaders";
  } else if (
    slug.includes("udemy") ||
    slug.includes("teachable") ||
    slug.includes("learning") ||
    slug.includes("course")
  ) {
    collection = "learning-tools";
  } else if (
    slug.includes("stock") ||
    slug.includes("rawpixel") ||
    slug.includes("adobe") ||
    slug.includes("flickr")
  ) {
    collection = "stock-assets";
  }

  const releaseStatus: ReleaseStatus = (data.status as ReleaseStatus) ?? "draft";
  const isPreRelease = releaseStatus === "pre_release";

  const normalizedFeaturedImage = normalizeProductAssetPath(data.featured_image) ?? undefined;
  const normalizedFeaturedGif = normalizeProductAssetPath(data.featured_image_gif) ?? undefined;

  const product: Product = {
    id: data.slug,
    title: data.name,
    handle: data.slug,
    description: data.tagline ?? undefined,
    thumbnail: normalizedFeaturedImage,
    images: normalizedFeaturedGif
      ? [
          { url: normalizedFeaturedImage ?? normalizedFeaturedGif },
          { url: normalizedFeaturedGif },
        ]
      : normalizedFeaturedImage
        ? [{ url: normalizedFeaturedImage }]
        : [],
    collection,
    status: releaseStatus,
    new_release: Boolean(data.new_release),
    popular: Boolean(data.popular),
    variants: [
      {
        id: `${data.slug}-default`,
        title: "Default",
        prices: [
          {
            amount: parsePrice(data.pricing?.price),
            currency_code: "USD",
          },
        ],
        inventory_quantity: 999,
      },
    ],
    metadata: {
      platform: data.platform ?? undefined,
      seo_title: data.seo_title ?? undefined,
      seo_description: data.seo_description ?? undefined,
      github_repo_url: data.github_repo_url ?? undefined,
      stripe_price_id: data.stripe?.price_id ?? undefined,
      original_price: data.pricing?.original_price ?? undefined,
      benefits: data.pricing?.benefits ?? undefined,
      features: data.features ?? undefined,
    },
  };

  const activeBadges = [
    isPreRelease && "pre_release",
    product.new_release && "new_release",
    product.popular && "popular",
  ].filter(Boolean) as string[];

  if (activeBadges.length > 1) {
    console.warn(
      `[products-data] Product "${product.handle}" has multiple badge flags enabled: ${activeBadges.join(", ")}`,
    );
  }

  return product;
}
