/**
 * Shared metadata contract for Stripe Payment Links created by the store.
 *
 * All helpers that author Payment Link metadata should import from here so the
 * contract stays centralized and the webhook can rely on a consistent shape.
 */

export type StripePaymentLinkMetadata = Record<string, string> & {
  /**
   * Product slug used across the storefront and analytics.
   */
  product_slug: string;
  /**
   * Origin of the metadata payload (e.g. script or automation name).
   */
  source: string;

  /**
   * Optional GHL tag identifier applied when the order syncs to GoHighLevel.
   */
  ghl_tag?: string;
  /**
   * Stripe product backing the Payment Link.
   */
  stripe_product_id?: string;

  /**
   * Human-friendly product name, mirrored into a few aliases for backwards compatibility.
   */
  productName?: string;
  product_name?: string;
  paymentDescription?: string;
  payment_description?: string;
  description?: string;

  /**
   * Recorded at update time (test/live) so downstream systems know which Stripe mode produced the event.
   */
  payment_link_mode?: string;
};

export interface StripePaymentLinkMetadataInput {
  slug: string;
  source: string;
  ghlTag?: string | null;
  stripeProductId?: string | null;
  productName?: string | null;
}

export function createStripePaymentLinkMetadata({
  slug,
  source,
  ghlTag,
  stripeProductId,
  productName,
}: StripePaymentLinkMetadataInput): StripePaymentLinkMetadata {
  const metadata: StripePaymentLinkMetadata = {
    product_slug: slug,
    source,
  };

  if (ghlTag && ghlTag.trim().length > 0) {
    metadata.ghl_tag = ghlTag.trim();
  }

  if (stripeProductId && stripeProductId.trim().length > 0) {
    metadata.stripe_product_id = stripeProductId.trim();
  }

  if (typeof productName === "string") {
    const trimmed = productName.trim();
    if (trimmed.length > 0) {
      metadata.productName = trimmed;
      metadata.product_name = trimmed;
      metadata.paymentDescription = trimmed;
      metadata.payment_description = trimmed;
      metadata.description = trimmed;
    }
  }

  return metadata;
}
