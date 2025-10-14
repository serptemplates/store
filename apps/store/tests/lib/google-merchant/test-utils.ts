import { productSchema, type ProductData } from "@/lib/products/product-schema";

type PricingOverrides = Partial<NonNullable<ProductData["pricing"]>>;
type ProductOverrides = Partial<Omit<ProductData, "pricing" | "categories" | "screenshots">> & {
  pricing?: PricingOverrides;
  categories?: ProductData["categories"];
  screenshots?: ProductData["screenshots"];
};

export function createTestProduct(overrides: ProductOverrides = {}): ProductData {
  const { pricing: pricingOverrides, categories, screenshots, ...rest } = overrides;

  const input: Record<string, unknown> = {
    slug: "demo-product",
    platform: "Web",
    seo_title: "Demo Product Title",
    seo_description: "Demo SEO description",
    store_serp_co_product_page_url: "https://store.serp.co/products/demo-product",
    apps_serp_co_product_page_url: "https://apps.serp.co/demo-product",
    serply_link: "https://serp.ly/demo-product",
    name: "Demo Product",
    tagline: "Instant productivity boost",
    description: "The definitive toolkit for creators.",
    pricing: {
      price: "$19",
      original_price: "$29",
      currency: "usd",
      availability: "OutOfStock",
      benefits: [],
      ...pricingOverrides,
    },
    success_url: "https://apps.serp.co/checkout/success?product=demo-product",
    cancel_url: "https://apps.serp.co/checkout?product=demo-product",
    categories: categories ?? ["AI Tools"],
    screenshots:
      screenshots ??
      [
        { url: "https://cdn.serp.co/demo-product-1.png" },
        { url: "https://cdn.serp.co/demo-product-2.png" },
      ],
    ...rest,
  };

  if (pricingOverrides) {
    const pricing = input.pricing as Record<string, unknown>;
    const removableKeys: Array<keyof PricingOverrides> = [
      "price",
      "original_price",
      "currency",
      "availability",
      "benefits",
    ];
    for (const key of removableKeys) {
      if (Object.prototype.hasOwnProperty.call(pricingOverrides, key) && pricingOverrides[key] === undefined) {
        delete pricing[key as string];
      }
    }
  }

  return productSchema.parse(input);
}
