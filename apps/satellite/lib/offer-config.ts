import { z } from "zod";

import { getProductData } from "@/lib/product";

const ghlConfigSchema = z
  .object({
    pipelineId: z.string(),
    stageId: z.string(),
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

    return offerConfigSchema.parse({
      id: product.slug,
      stripePriceId: stripeConfig.price_id,
      successUrl: stripeConfig.success_url,
      cancelUrl: stripeConfig.cancel_url,
      mode: stripeConfig.mode ?? "payment",
      metadata: {
        productSlug: product.slug,
        productName: product.name,
        productPageUrl: product.product_page_url,
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
            pipelineId: product.ghl.pipeline_id,
            stageId: product.ghl.stage_id,
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
