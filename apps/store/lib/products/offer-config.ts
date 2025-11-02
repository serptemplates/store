import { z } from "zod";

import { getProductData } from "@/lib/products/product";
import type { ProductData } from "@/lib/products/product-schema";
import { isStripeTestMode } from "@/lib/payments/stripe-environment";
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

const offerConfigSchema = z.object({
  id: z.string(),
  stripePriceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  mode: z.enum(["payment", "subscription"]).default("payment"),
  metadata: z.record(z.string()).optional(),
  productName: z.string().optional(),
  productDescription: z.string().optional(),
  productImage: z.string().url().optional(),
  ghl: ghlConfigSchema,
});

export type OfferConfig = z.infer<typeof offerConfigSchema>;

/**
 * Derives offer configuration directly from the product content definition.
 */
export function getOfferConfig(offerId: string): OfferConfig | null {
  try {
    const product = getProductData(offerId);
    const stripeConfig = product.stripe;

    if (!stripeConfig) {
      return null;
    }

    const isTest = isStripeTestMode();

    // Use the appropriate price ID based on environment
    // The resolvePriceForEnvironment function will handle auto-cloning from live to test
    let priceId = stripeConfig.price_id;

    if (isTest && stripeConfig.test_price_id) {
      // Use explicitly configured test price if available
      priceId = stripeConfig.test_price_id;
    }
    // Otherwise, use the live price ID and let resolvePriceForEnvironment handle it

    // Adjust URLs for localhost
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    const defaultBaseUrl = isTest ? "http://localhost:3000" : "https://apps.serp.co";
    const baseUrl = configuredSiteUrl ?? defaultBaseUrl;

    const rawSuccessUrl = isTest
      ? `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
      : product.success_url ?? `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const successUrl = ensureSuccessUrlHasSessionPlaceholder(rawSuccessUrl);
    const cancelUrl = isTest
      ? `${baseUrl}/checkout?canceled=true`
      : product.cancel_url ?? `${baseUrl}/checkout?canceled=true`;

    const normalizedImage = normalizeProductAssetPath(product.featured_image);
    const productImageUrl = normalizedImage
      ? normalizedImage.startsWith("http")
        ? normalizedImage
        : toAbsoluteProductAssetUrl(normalizedImage, baseUrl)
      : undefined;

    // Collect license metadata (entitlements/features) from product content
    // Normalize entitlements to string[] if provided
    const rawEntitlements = (product as ProductData)?.license?.entitlements as unknown;
    const licenseEntitlements: string[] | undefined = Array.isArray(rawEntitlements)
      ? (rawEntitlements as string[]).filter((s) => typeof s === "string" && s.trim().length > 0)
      : typeof rawEntitlements === "string" && rawEntitlements.trim().length > 0
      ? [rawEntitlements.trim()]
      : undefined;

    return offerConfigSchema.parse({
      id: product.slug,
      stripePriceId: priceId,
      successUrl,
      cancelUrl,
      mode: stripeConfig.mode ?? "payment",
      metadata: {
        productSlug: product.slug,
        productName: product.name,
        productPageUrl: product.apps_serp_co_product_page_url ?? product.store_serp_co_product_page_url,
        store_serp_co_product_page_url: product.store_serp_co_product_page_url,
        apps_serp_co_product_page_url: product.apps_serp_co_product_page_url,
        purchaseUrl: product.serply_link,
        serply_link: product.serply_link,
        success_url: successUrl,
        cancel_url: cancelUrl,
        environment: isTest ? 'test' : 'live',
        ...(licenseEntitlements ? { licenseEntitlements } : {}),
        ...(stripeConfig.metadata ?? {}),
      },
      productName: product.name,
      productDescription: product.tagline ?? product.seo_description,
      productImage: productImageUrl,
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
    });
  } catch {
    return null;
  }
}
