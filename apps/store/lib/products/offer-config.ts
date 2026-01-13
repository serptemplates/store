import { z } from "zod";

import { getProductData } from "@/lib/products/product";
import type { ProductData, ProductPayment } from "@/lib/products/product-schema";
import { paymentSchema } from "@/lib/products/product-schema";
import { isStripeTestMode } from "@/lib/payments/stripe-environment";
import { resolveStripePaymentDetails } from "@/lib/products/payment";
import type { PaymentProviderId, StripePaymentDetails } from "@/lib/products/payment";
import { normalizeProductAssetPath, toAbsoluteProductAssetUrl } from "./asset-paths";

const CHECKOUT_SESSION_PLACEHOLDER = "{CHECKOUT_SESSION_ID}";

export function ensureSuccessUrlHasSessionPlaceholder(url: string): string {
  if (!url || url.includes(CHECKOUT_SESSION_PLACEHOLDER)) {
    return url;
  }

  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return url;
  }

  const endsWithDelimiter = trimmed.endsWith("?") || trimmed.endsWith("&");
  const separator = endsWithDelimiter ? "" : trimmed.includes("?") ? "&" : "?";

  return `${trimmed}${separator}session_id=${CHECKOUT_SESSION_PLACEHOLDER}`;
}

const ghlConfigSchema = z
  .object({
    pipelineId: z.string().optional(),
    stageId: z.string().optional(),
    status: z.string().optional(),
    source: z.string().optional(),
    tagIds: z.array(z.string()).optional(),
    workflowIds: z.array(z.string()).optional(),
    opportunityNameTemplate: z.string().optional(),
    contactCustomFieldIds: z.record(z.string()).optional(),
    opportunityCustomFieldIds: z.record(z.string()).optional(),
  })
  .optional();

const optionalItemConfigSchema = z.object({
  product_id: z.string(),
  price_id: z.string().optional(),
  quantity: z.number().int().min(1).default(1).optional(),
});

type OptionalItemConfig = z.infer<typeof optionalItemConfigSchema>;

const offerPaymentSchema = paymentSchema;

const offerConfigSchema = z.object({
  id: z.string(),
  stripePriceId: z.string().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  mode: z.enum(["payment", "subscription"]).default("payment"),
  metadata: z.record(z.string()).optional(),
  productName: z.string().optional(),
  productDescription: z.string().optional(),
  productImage: z.string().url().optional(),
  optionalItems: z.array(optionalItemConfigSchema).optional(),
  ghl: ghlConfigSchema,
  payment: offerPaymentSchema,
});

export type OfferConfig = z.infer<typeof offerConfigSchema>;

/**
 * Derives offer configuration directly from the product content definition.
 */
function mergeMetadata(...records: Array<Record<string, unknown> | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const record of records) {
    if (!record) continue;
    for (const [key, value] of Object.entries(record)) {
      if (value == null) continue;
      if (typeof value === "string") {
        out[key] = value;
      } else if (Array.isArray(value)) {
        out[key] = value.map((v) => (typeof v === "string" ? v : String(v))).join(",");
      } else if (typeof value === "number" || typeof value === "boolean") {
        out[key] = String(value);
      } else {
        try {
          out[key] = JSON.stringify(value);
        } catch {
          out[key] = String(value);
        }
      }
    }
  }
  return out;
}

const GLOBAL_OPTIONAL_ITEM_SLUGS = ["serp-vpn"] as const;

function resolveStripeProductIdForEnv(product: ProductData, isTestEnv: boolean): string | null {
  const stripeConfig = product.payment?.stripe ?? product.stripe;
  const metadata = stripeConfig?.metadata ?? {};

  const liveId = typeof metadata.stripe_product_id === "string" ? metadata.stripe_product_id.trim() : "";
  const testId =
    typeof (metadata as Record<string, unknown>).stripe_test_product_id === "string"
      ? String((metadata as Record<string, unknown>).stripe_test_product_id).trim()
      : "";

  const id = isTestEnv && testId ? testId : liveId;
  return id || null;
}

function getGlobalOptionalItems(product: ProductData, options: { isTestEnv: boolean }): OptionalItemConfig[] {
  const items: OptionalItemConfig[] = [];

  for (const slug of GLOBAL_OPTIONAL_ITEM_SLUGS) {
    if (slug === product.slug) continue;

    try {
      const optionalProduct = getProductData(slug);
      const productId = resolveStripeProductIdForEnv(optionalProduct, false);
      if (!productId) {
        // eslint-disable-next-line no-console
        console.error(
          `[offer-config] Missing Stripe product ID for global optional item "${slug}" in ${
            options.isTestEnv ? "test" : "live"
          } mode`,
        );
        continue;
      }

      items.push({
        product_id: productId,
        quantity: 1,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `[offer-config] Failed to load global optional item "${slug}":`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return items;
}

function mergeOptionalItems(
  base: OptionalItemConfig[] | null | undefined,
  extra: OptionalItemConfig[] | null | undefined,
): OptionalItemConfig[] | undefined {
  const merged = [...(base ?? []), ...(extra ?? [])];
  if (merged.length === 0) {
    return undefined;
  }

  const seen = new Set<string>();
  const result: OptionalItemConfig[] = [];

  for (const item of merged) {
    if (!item.product_id) continue;
    if (seen.has(item.product_id)) continue;
    seen.add(item.product_id);
    result.push({
      product_id: item.product_id,
      price_id: item.price_id,
      quantity: item.quantity ?? 1,
    });
  }

  return result;
}

function buildPaymentConfig(
  product: ProductData,
  stripeDetails: StripePaymentDetails | null,
): ProductPayment | undefined {
  if (product.payment) {
    return product.payment;
  }

  if (!stripeDetails && !product.stripe) {
    return undefined;
  }

  const optionalItems = stripeDetails?.optionalItems ?? product.stripe?.optional_items;

  const mergedMetadata = mergeMetadata(
    product.checkout_metadata,
    stripeDetails?.metadata ?? {},
    product.stripe?.metadata ?? {},
  );

  return {
    provider: "stripe",
    account: stripeDetails?.account ?? undefined,
    mode: stripeDetails?.mode ?? product.stripe?.mode ?? "payment",
    success_url: stripeDetails?.successUrl ?? product.success_url ?? undefined,
    cancel_url: stripeDetails?.cancelUrl ?? product.cancel_url ?? undefined,
    metadata: mergedMetadata,
    stripe: {
      price_id: stripeDetails?.priceId ?? product.stripe?.price_id,
      test_price_id: stripeDetails?.testPriceId ?? product.stripe?.test_price_id,
      mode: stripeDetails?.mode ?? product.stripe?.mode,
      metadata: mergeMetadata(product.checkout_metadata, stripeDetails?.metadata ?? {}, product.stripe?.metadata ?? {}),
      optional_items: optionalItems,
    },
  };
}

function resolveStripePriceId(
  isTest: boolean,
  product: ProductData,
  payment: ProductPayment | undefined,
  stripeDetails: StripePaymentDetails | null,
): string | null {
  const livePrice =
    payment?.stripe?.price_id ?? stripeDetails?.priceId ?? product.stripe?.price_id ?? null;
  const testPrice =
    payment?.stripe?.test_price_id ?? stripeDetails?.testPriceId ?? product.stripe?.test_price_id ?? null;

  if (isTest && testPrice) {
    return testPrice;
  }
  return livePrice;
}

function normalizeOptionalItemsFromPayment(
  payment: ProductPayment | undefined,
  product: ProductData,
  isTestEnv: boolean,
): OptionalItemConfig[] | undefined {
  const items = payment?.stripe?.optional_items;
  const base: OptionalItemConfig[] | undefined = items
    ? items.map((item) => ({
        product_id: item.product_id,
        price_id: item.price_id ?? undefined,
        quantity: item.quantity ?? 1,
      }))
    : undefined;

  const global = getGlobalOptionalItems(product, { isTestEnv });
  return mergeOptionalItems(base, global);
}

export function getOfferConfig(offerId: string): OfferConfig | null {
  try {
    const product = getProductData(offerId);
    const stripeDetails = resolveStripePaymentDetails(product);
    const isTest = isStripeTestMode();
    const paymentConfig = buildPaymentConfig(product, stripeDetails);
    const provider: PaymentProviderId = paymentConfig?.provider ?? "stripe";

    const priceId = resolveStripePriceId(isTest, product, paymentConfig, stripeDetails);
    if (provider === "stripe" && !priceId) {
      return null;
    }

    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    const defaultBaseUrl = isTest ? "http://localhost:3000" : "https://apps.serp.co";
    const baseUrl = configuredSiteUrl ?? defaultBaseUrl;

    const configuredSuccessUrl =
      paymentConfig?.success_url ?? stripeDetails?.successUrl ?? product.success_url ?? undefined;
    const rawSuccessUrl = isTest
      ? `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
      : configuredSuccessUrl ?? `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const successUrl = ensureSuccessUrlHasSessionPlaceholder(rawSuccessUrl);
    const cancelUrl = isTest
      ? `${baseUrl}/checkout?canceled=true`
      : paymentConfig?.cancel_url ?? stripeDetails?.cancelUrl ?? product.cancel_url ?? `${baseUrl}/checkout?canceled=true`;

    const normalizedImage = normalizeProductAssetPath(product.featured_image);
    const productImageUrl = normalizedImage
      ? normalizedImage.startsWith("http")
        ? normalizedImage
        : toAbsoluteProductAssetUrl(normalizedImage, baseUrl)
      : undefined;

    const rawEntitlements = (product as ProductData)?.license?.entitlements as unknown;
    const licenseEntitlements: string[] | undefined = Array.isArray(rawEntitlements)
      ? (rawEntitlements as string[]).filter((s) => typeof s === "string" && s.trim().length > 0)
      : typeof rawEntitlements === "string" && rawEntitlements.trim().length > 0
      ? [rawEntitlements.trim()]
      : undefined;

    const productPageUrl =
      product.product_page_url ?? product.serp_co_product_page_url ?? product.serply_link;

    const metadata = mergeMetadata(
      {
        product_slug: product.slug,
        product_name: product.name,
        product_page_url: productPageUrl,
        serply_link: product.serply_link,
        success_url: successUrl,
        cancel_url: cancelUrl,
        environment: isTest ? "test" : "live",
        ...(licenseEntitlements ? { license_entitlements: licenseEntitlements } : {}),
      },
      product.checkout_metadata,
      stripeDetails?.metadata ?? {},
      paymentConfig?.metadata ?? {},
    );
    delete (metadata as Record<string, unknown>)["purchase_url"];
    delete (metadata as Record<string, unknown>)["purchaseUrl"];

    const normalizedOptionalItems = normalizeOptionalItemsFromPayment(paymentConfig, product, isTest);

    return offerConfigSchema.parse({
      id: product.slug,
      stripePriceId: priceId ?? undefined,
      successUrl,
      cancelUrl,
      mode: paymentConfig?.mode ?? stripeDetails?.mode ?? "payment",
      metadata,
      productName: product.name,
      productDescription: product.tagline ?? product.seo_description,
      productImage: productImageUrl,
      optionalItems: normalizedOptionalItems,
      ghl: product.ghl
        ? {
            pipelineId: product.ghl.pipeline_id ?? undefined,
            stageId: product.ghl.stage_id ?? undefined,
            status: product.ghl.status,
            source: product.ghl.source,
            tagIds: product.ghl.tag_ids && product.ghl.tag_ids.length > 0 ? product.ghl.tag_ids : undefined,
            workflowIds:
              product.ghl.workflow_ids && product.ghl.workflow_ids.length > 0
                ? product.ghl.workflow_ids
                : undefined,
            opportunityNameTemplate: product.ghl.opportunity_name_template,
            contactCustomFieldIds: product.ghl.contact_custom_field_ids,
            opportunityCustomFieldIds: product.ghl.opportunity_custom_field_ids,
          }
        : undefined,
      payment: paymentConfig,
    });
  } catch {
    return null;
  }
}
