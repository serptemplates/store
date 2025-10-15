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

function parsePrice(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const match = value.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) {
    return null;
  }
  const parsed = Number.parseFloat(match[1]);
  return Number.isNaN(parsed) ? null : parsed;
}

export function extractPrice(product: ProductData): { value: string; currency: string } {
  const currency = product.pricing?.currency?.toUpperCase() ?? "USD";
  const candidate = product.pricing?.price ?? product.pricing?.original_price ?? "";
  const parsed = parsePrice(candidate) ?? 0;
  return { value: parsed.toFixed(2), currency };
}

export function extractSalePrice(product: ProductData): { value: string; currency: string } | null {
  const sale = parsePrice(product.pricing?.price ?? null);
  const original = parsePrice(product.pricing?.original_price ?? null);
  if (sale === null || original === null || sale >= original) {
    return null;
  }
  const currency = product.pricing?.currency?.toUpperCase() ?? "USD";
  return { value: sale.toFixed(2), currency };
}

function buildStoreLink(product: ProductData, siteUrl: string): string | undefined {
  if (product.store_serp_co_product_page_url) {
    return product.store_serp_co_product_page_url;
  }
  if (!siteUrl) {
    return undefined;
  }
  return `${siteUrl.replace(/\/$/, "")}/product-details/product/${product.slug}`;
}

function buildAppsLink(product: ProductData, appsUrl: string): string | undefined {
  if (product.apps_serp_co_product_page_url) {
    return product.apps_serp_co_product_page_url;
  }
  if (!appsUrl) {
    return undefined;
  }
  return `${appsUrl.replace(/\/$/, "")}/${product.slug}`;
}

function collectAdditionalImages(product: ProductData): string[] {
  return (product.screenshots ?? [])
    .map((shot) => {
      if (shot && typeof shot === "object" && "url" in shot) {
        const candidate = (shot as { url?: unknown }).url;
        return typeof candidate === "string" ? candidate : null;
      }
      return typeof shot === "string" ? shot : null;
    })
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

function resolveAvailability(product: ProductData): "in stock" | "out of stock" {
  const availability = product.pricing?.availability?.toLowerCase();
  return availability === "outofstock" || availability === "out_of_stock" ? "out of stock" : "in stock";
}

export function buildMerchantProduct(product: ProductData, options: MerchantProductOptions): MerchantProduct {
  const storeLink = buildStoreLink(product, options.siteUrl);
  const appsLink = buildAppsLink(product, options.appsUrl);
  const primaryLink = appsLink ?? storeLink;

  if (!primaryLink) {
    throw new Error(`Unable to determine product link for slug "${product.slug}"`);
  }

  const price = extractPrice(product);
  const salePrice = extractSalePrice(product);
  const descriptionSource = product.seo_description ?? product.description ?? product.tagline ?? product.name;
  const description = sanitizeDescription(descriptionSource);
  const additionalImages = collectAdditionalImages(product);
  const productTypes = collectProductTypes(product);

  return {
    channel: "online",
    offerId: product.slug,
    title: product.name,
    description,
    link: primaryLink,
    mobileLink: storeLink && storeLink !== primaryLink ? storeLink : undefined,
    imageLink: product.featured_image ?? undefined,
    additionalImageLinks: additionalImages.length ? additionalImages : undefined,
    contentLanguage: options.language,
    targetCountry: options.country,
    availability: resolveAvailability(product),
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
