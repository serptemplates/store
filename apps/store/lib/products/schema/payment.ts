import { z } from "zod";
import { optionalExternalUrl, optionalTrimmedString, stripeIdSchema, trimmedString } from "./helpers";

const optionalItemSchema = z.object({
  product_id: stripeIdSchema(["prod_"]),
  price_id: stripeIdSchema(["price_"]).optional(),
  quantity: z.number().int().min(1).default(1).optional(),
});

const stripeSchemaShape = {
  price_id: stripeIdSchema(["price_"]).optional(),
  test_price_id: stripeIdSchema(["price_"]).optional(),
  mode: z.enum(["payment", "subscription"]).optional(),
  metadata: z
    .preprocess(
      (value) => {
        if (value === null || value === undefined) {
          return {};
        }
        return value;
      },
      z.record(trimmedString()).default({}),
    ),
  optional_items: z.preprocess(
    (value) => {
      if (value === null || value === undefined) {
        return undefined;
      }
      return value;
    },
    z.array(optionalItemSchema).optional(),
  ),
} satisfies Record<string, z.ZodTypeAny>;

export const stripeSchema = z.object(stripeSchemaShape);

const providerMetadataSchema = z.record(trimmedString());

const whopEnvironmentSchema = z
  .object({
    listing_id: optionalTrimmedString(),
    plan_id: optionalTrimmedString(),
    offer_id: optionalTrimmedString(),
    product_id: optionalTrimmedString(),
    checkout_url: optionalExternalUrl,
  })
  .strict();

const whopSchema = z
  .object({
    api_key_alias: optionalTrimmedString(),
    webhook_secret_alias: optionalTrimmedString(),
    metadata: providerMetadataSchema.optional(),
    live: whopEnvironmentSchema.optional(),
    test: whopEnvironmentSchema.optional(),
  })
  .optional();

const easyPayDirectEnvironmentSchema = z
  .object({
    product_id: optionalTrimmedString(),
    campaign_id: optionalTrimmedString(),
    offer_id: optionalTrimmedString(),
    checkout_url: optionalExternalUrl,
  })
  .strict();

const easyPayDirectSchema = z
  .object({
    api_key_alias: optionalTrimmedString(),
    webhook_secret_alias: optionalTrimmedString(),
    metadata: providerMetadataSchema.optional(),
    live: easyPayDirectEnvironmentSchema.optional(),
    test: easyPayDirectEnvironmentSchema.optional(),
  })
  .optional();

const lemonSqueezyEnvironmentSchema = z
  .object({
    store_id: optionalTrimmedString(),
    product_id: optionalTrimmedString(),
    variant_id: optionalTrimmedString(),
    price_id: optionalTrimmedString(),
    checkout_url: optionalExternalUrl,
  })
  .strict();

const lemonSqueezySchema = z
  .object({
    api_key_alias: optionalTrimmedString(),
    webhook_secret_alias: optionalTrimmedString(),
    metadata: providerMetadataSchema.optional(),
    live: lemonSqueezyEnvironmentSchema.optional(),
    test: lemonSqueezyEnvironmentSchema.optional(),
  })
  .optional();

export const PAYMENT_PROVIDER_IDS = [
  "stripe",
  "whop",
  "easy_pay_direct",
  "lemonsqueezy",
  "paypal",
] as const;

export type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number];

export const PAYMENT_PROVIDERS = PAYMENT_PROVIDER_IDS;

export const paymentSchema = z
  .object({
    provider: z.enum(PAYMENT_PROVIDER_IDS).default("stripe"),
    account: optionalTrimmedString(),
    mode: z.enum(["payment", "subscription"]).optional(),
    success_url: optionalTrimmedString(),
    cancel_url: optionalTrimmedString(),
    metadata: z.record(trimmedString()).optional(),
    stripe: stripeSchema.optional(),
    whop: whopSchema,
    easy_pay_direct: easyPayDirectSchema,
    lemonsqueezy: lemonSqueezySchema,
  })
  .optional();

export type ProductPayment = z.infer<typeof paymentSchema>;

export function resolveStripePriceId(payment?: z.infer<typeof paymentSchema>): string | null {
  if (payment?.provider === "stripe" && payment.stripe?.price_id) {
    return payment.stripe.price_id;
  }
  return null;
}

export const PAYMENT_FIELD_ORDER = [
  "provider",
  "account",
  "mode",
  "success_url",
  "cancel_url",
  "metadata",
  "stripe",
  "whop",
  "easy_pay_direct",
  "lemonsqueezy",
] as const;

export const STRIPE_FIELD_ORDER = ["price_id", "test_price_id", "mode", "metadata", "optional_items"] as const;
export const WHOP_FIELD_ORDER = ["api_key_alias", "webhook_secret_alias", "metadata", "live", "test"] as const;
export const EASY_PAY_DIRECT_FIELD_ORDER = [
  "api_key_alias",
  "webhook_secret_alias",
  "metadata",
  "live",
  "test",
] as const;
export const LEMONSQUEEZY_FIELD_ORDER = [
  "api_key_alias",
  "webhook_secret_alias",
  "metadata",
  "live",
  "test",
] as const;

export const WHOP_ENVIRONMENT_FIELD_ORDER = [
  "listing_id",
  "plan_id",
  "offer_id",
  "product_id",
  "checkout_url",
] as const;

export const EASY_PAY_DIRECT_ENVIRONMENT_FIELD_ORDER = [
  "product_id",
  "campaign_id",
  "offer_id",
  "checkout_url",
] as const;

export const LEMONSQUEEZY_ENVIRONMENT_FIELD_ORDER = [
  "store_id",
  "product_id",
  "variant_id",
  "price_id",
  "checkout_url",
] as const;
