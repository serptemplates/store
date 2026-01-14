import { resolveProductPrice } from "@/lib/pricing/price-manifest";
import { normalizeProductAssetPath, toAbsoluteProductAssetUrl } from "@/lib/products/asset-paths";
import { resolveProductPageUrl } from "@/lib/products/product-urls";
import type { ProductData } from "../products/product-schema";

export type MerchantProduct = {
  channel: "online";
  offerId: string;
  title: string;
  description: string;
  link: string;
  mobileLink?: string;
  imageLink?: string;
  additionalImageLinks?: string[];
  contentLanguage: string;
  targetCountry: string;
  availability: "in stock" | "out of stock";
  condition: "new";
  price: {
    value: string;
    currency: string;
  };
  brand: string;
  identifierExists: boolean;
  shipping: Array<{
    country: string;
    price: { value: string; currency: string };
  }>;
  googleProductCategory?: string;
  productTypes?: string[];
  mpn?: string | null;
  gtin?: string | null;
  salePrice?: { value: string; currency: string };
  salePriceEffectiveDate?: string;
  customLabel0?: string;
  adult: boolean;
};

export type MerchantProductOptions = {
  country: string;
  language: string;
  siteUrl: string;
  appsUrl: string;
};

const DEFAULT_BRAND = "SERP Apps";
const DEFAULT_CATEGORY = "Software > Computer Software";

export function sanitizeDescription(input: string | null | undefined): string {
  if (!input) {
    return "";
  }
  return input.replace(/\s+/g, " ").trim().slice(0, 4999);
}

export function extractPrice(product: ProductData): { value: string; currency: string } {
  const priceDetails = resolveProductPrice(product);
  return {
    value: (priceDetails.amount ?? 0).toFixed(2),
    currency: priceDetails.currency,
  };
}

export function extractSalePrice(product: ProductData): { value: string; currency: string } | null {
  const priceDetails = resolveProductPrice(product);
  if (
    priceDetails.amount != null
    && priceDetails.compareAtAmount != null
    && priceDetails.compareAtAmount > priceDetails.amount
  ) {
    return { value: priceDetails.amount.toFixed(2), currency: priceDetails.currency };
  }
  return null;
}

function buildAppsLink(product: ProductData, appsUrl: string, siteUrl: string): string | undefined {
  const baseUrl = appsUrl || siteUrl;
  if (!baseUrl) {
    return undefined;
  }
  return resolveProductPageUrl(product, { baseUrl });
}

function collectAdditionalImages(product: ProductData, origin: string): string[] {
  return (product.screenshots ?? [])
    .map((shot) => {
      if (shot && typeof shot === "object" && "url" in shot) {
        return normalizeProductAssetPath((shot as { url?: unknown }).url as string | undefined);
      }
      return normalizeProductAssetPath(typeof shot === "string" ? shot : undefined);
    })
    .filter((value): value is string => Boolean(value))
    .map((value) => toAbsoluteProductAssetUrl(value, origin))
    .filter((value): value is string => Boolean(value));
}

function collectProductTypes(product: ProductData): string[] {
  const values: string[] = [];
  if (product.categories?.length) {
    values.push(...product.categories);
  }
  if (product.platform) {
    values.push(`Platform::${product.platform}`);
  }
  return values;
}

function resolveAvailability(): "in stock" {
  return "in stock";
}

export function buildMerchantProduct(product: ProductData, options: MerchantProductOptions): MerchantProduct {
  const appsLink = buildAppsLink(product, options.appsUrl, options.siteUrl);
  const primaryLink = appsLink;

  if (!primaryLink) {
    throw new Error(`Unable to determine product link for slug "${product.slug}"`);
  }

  const price = extractPrice(product);
  const salePrice = extractSalePrice(product);
  const descriptionSource = product.seo_description ?? product.description ?? product.tagline ?? product.name;
  const description = sanitizeDescription(descriptionSource);
  const imageOrigin = options.appsUrl || options.siteUrl;
  const normalizedFeaturedImage = normalizeProductAssetPath(product.featured_image);
  const imageLink = normalizedFeaturedImage
    ? toAbsoluteProductAssetUrl(normalizedFeaturedImage, imageOrigin)
    : undefined;
  const additionalImages = collectAdditionalImages(product, imageOrigin);
  const productTypes = collectProductTypes(product);

  return {
    channel: "online",
    offerId: product.slug,
    title: product.name,
    description,
    link: primaryLink,
    mobileLink: primaryLink,
    imageLink: imageLink ?? undefined,
    additionalImageLinks: additionalImages.length ? additionalImages : undefined,
    contentLanguage: options.language,
    targetCountry: options.country,
    availability: resolveAvailability(),
    condition: "new",
    price,
    brand: product.brand ?? DEFAULT_BRAND,
    identifierExists: false,
    shipping: [
      {
        country: options.country,
        price: { value: "0.00", currency: price.currency },
      },
    ],
    googleProductCategory: DEFAULT_CATEGORY,
    productTypes: productTypes.length ? productTypes : undefined,
    mpn: product.sku ?? null,
    gtin: null,
    salePrice: salePrice ?? undefined,
    salePriceEffectiveDate: undefined,
    customLabel0: product.platform ?? undefined,
    adult: false,
  };
}
