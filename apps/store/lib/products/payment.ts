import type { ProductData, ProductPayment } from "@/lib/products/product-schema";

export const PAYMENT_PROVIDERS = [
  "stripe",
  "whop",
  "easy_pay_direct",
  "lemonsqueezy",
  "paypal",
] as const;

export type PaymentProviderId = (typeof PAYMENT_PROVIDERS)[number];
export type PaymentConfig = ProductPayment;

export type StripePaymentDetails = {
  provider: "stripe";
  account: string | null;
  mode: "payment" | "subscription";
  priceId: string | null;
  testPriceId: string | null;
  metadata: Record<string, string>;
  optionalItems: NonNullable<NonNullable<ProductPayment>["stripe"]>["optional_items"];
  successUrl: string | null;
  cancelUrl: string | null;
};

function normalizeOptionalItems(items?: NonNullable<NonNullable<ProductPayment>["stripe"]>["optional_items"]) {
  if (!Array.isArray(items) || items.length === 0) {
    return undefined;
  }
  return items;
}

export function resolveStripePaymentDetails(product: ProductData): StripePaymentDetails | null {
  const payment = product.payment?.provider === "stripe" ? product.payment : undefined;
  const stripeConfig = payment?.stripe;

  if (!stripeConfig) {
    return null;
  }

  return {
    provider: "stripe",
    account: payment?.account?.trim() ?? null,
    mode: payment?.mode ?? stripeConfig.mode ?? "payment",
    priceId: stripeConfig.price_id ?? null,
    testPriceId: stripeConfig.test_price_id ?? null,
    metadata: stripeConfig.metadata ?? {},
    optionalItems: normalizeOptionalItems(stripeConfig.optional_items) ?? [],
    successUrl: payment?.success_url?.trim() ?? null,
    cancelUrl: payment?.cancel_url?.trim() ?? null,
  };
}

export function getStripePriceIds(product: ProductData): { live?: string | null; test?: string | null } {
  const details = resolveStripePaymentDetails(product);
  if (!details) {
    return {
      live: null,
      test: null,
    };
  }

  return {
    live: details.priceId,
    test: details.testPriceId,
  };
}

export function getPaymentProvider(product: ProductData): PaymentProviderId {
  if (product.payment?.provider) {
    return product.payment.provider;
  }
  return "stripe";
}
