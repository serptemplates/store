import { z } from "zod";

import { getProductData } from "@/lib/products/product";
import { isStripeTestMode } from "@/lib/payments/stripe-environment";

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
    const defaultBaseUrl = isTest ? "http://localhost:3000" : "https://store.serp.co";
    const baseUrl = configuredSiteUrl ?? defaultBaseUrl;

    const successUrl = isTest
      ? `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
      : stripeConfig.success_url ?? `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = isTest
      ? `${baseUrl}/checkout?canceled=true`
      : stripeConfig.cancel_url ?? `${baseUrl}/checkout?canceled=true`;

    return offerConfigSchema.parse({
      id: product.slug,
      stripePriceId: priceId,
      successUrl,
      cancelUrl,
      mode: stripeConfig.mode ?? "payment",
      metadata: {
        productSlug: product.slug,
        productName: product.name,
        productPageUrl: product.product_page_url,
        environment: isTest ? 'test' : 'live',
        ...(stripeConfig.metadata ?? {}),
      },
      productName: product.name,
      productDescription: product.tagline ?? product.seo_description,
      productImage:
        typeof product.featured_image === "string" && product.featured_image.startsWith("http")
          ? product.featured_image
          : undefined,
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
