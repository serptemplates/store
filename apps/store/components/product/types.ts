import type { ProductData } from "@/lib/products/product-schema";

export type ExtendedProductMetadata = {
  price_label?: string | null;
  original_price?: string | null;
  benefits?: unknown;
  features?: unknown;
  github_repo_url?: string;
  deliverables?: unknown[];
  bulk_tools?: unknown;
  automations?: unknown;
  order_bump?: unknown;
};

export type ExtendedProductData = ProductData & {
  title?: string;
  handle?: string;
  thumbnail?: string | null;
  variants?: Array<{
    prices?: Array<{
      amount?: number;
      currency_code?: string;
      label?: string | null;
      original_price?: string | null;
      price?: string | null;
    }>;
  }>;
  metadata?: ExtendedProductMetadata;
  images?: Array<{ url: string } | string>;
};
