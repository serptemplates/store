import Stripe from "stripe";

import {
  createStripePaymentLinkMetadata,
  type StripePaymentLinkMetadata,
  type StripePaymentLinkMetadataInput,
} from "./payment-link-metadata";

export type StripeMode = "live" | "test";

export interface MetadataOptions extends Omit<StripePaymentLinkMetadataInput, "source"> {
  source?: string;
}

export interface SuccessRedirectOptions {
  baseUrl: string;
  slug: string;
  paymentLinkId: string;
  mode: StripeMode;
}

export interface PaymentLinkUpdateOptions extends MetadataOptions {
  paymentLinkId: string;
  mode: StripeMode;
  baseUrl: string;
}

export interface TermsOfServiceResult {
  status: "already_required" | "updated" | "manual_required";
  reason?: string;
}

const DEFAULT_METADATA_SOURCE = "store-scripts/sync-stripe-payment-links";

export function buildMetadata({
  slug,
  ghlTag,
  stripeProductId,
  source = DEFAULT_METADATA_SOURCE,
  productName,
}: MetadataOptions): StripePaymentLinkMetadata {
  return createStripePaymentLinkMetadata({
    slug,
    source,
    ghlTag: ghlTag ?? null,
    stripeProductId: stripeProductId ?? null,
    productName: productName ?? null,
  });
}

export function buildSuccessRedirectUrl({
  baseUrl,
  slug,
  paymentLinkId,
  mode,
}: SuccessRedirectOptions): string {
  const trimmedBase = baseUrl.replace(/\/$/, "");
  const url = new URL(trimmedBase);
  url.searchParams.set("provider", "stripe");
  url.searchParams.set("slug", slug);
  url.searchParams.set("payment_link_id", paymentLinkId);
  url.searchParams.set("mode", mode);

  const serialized = url.toString();
  const separator = serialized.includes("?") ? "&" : "?";
  return `${serialized}${separator}session_id={CHECKOUT_SESSION_ID}`;
}

export function buildPaymentLinkUpdatePayload({
  slug,
  ghlTag,
  stripeProductId,
  paymentLinkId,
  mode,
  baseUrl,
  source = DEFAULT_METADATA_SOURCE,
  productName,
}: PaymentLinkUpdateOptions): Stripe.PaymentLinkUpdateParams {
  const metadata = buildMetadata({ slug, ghlTag, stripeProductId, source, productName });
  metadata.payment_link_mode = mode;

    const successUrl = buildSuccessRedirectUrl({
      baseUrl,
      slug,
      paymentLinkId,
      mode,
    });

    const payload: Stripe.PaymentLinkUpdateParams = {
      active: true,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      automatic_tax: { enabled: false },
      tax_id_collection: { enabled: false },
      customer_creation: "if_required",
      invoice_creation: { enabled: false },
      after_completion: {
        type: "redirect",
        redirect: {
          url: successUrl,
        },
      },
      metadata,
      payment_intent_data: {
        metadata,
        description: productName ? `SERP Apps - ${productName}` : undefined,
      },
    };

    (
      payload as Stripe.PaymentLinkUpdateParams & {
        phone_number_collection?: { enabled: boolean };
      }
    ).phone_number_collection = { enabled: false };

    return payload;
  }

  function isConsentParameterUnknown(error: Stripe.errors.StripeError | undefined):
  boolean {
    if (!error) {
      return false;
    }
    if (error.code === "parameter_unknown") {
      return true;
    }
    return typeof error.message === "string" &&
  error.message.includes("consent_collection");
  }

  export async function ensureTermsOfServiceRequired(
    stripe: Stripe,
    paymentLinkId: string,
  ): Promise<TermsOfServiceResult> {
    try {
      const link = await stripe.paymentLinks.retrieve(paymentLinkId);
      if (link.consent_collection?.terms_of_service === "required") {
        return { status: "already_required" };
      }
    } catch {
      // Unable to verify existing setting; proceed with update attempt.
    }

    const tosPayload: Stripe.PaymentLinkUpdateParams = {};
    (
      tosPayload as Stripe.PaymentLinkUpdateParams & {
        consent_collection?: { terms_of_service?: "required" | "not_required" | null };
      }
    ).consent_collection = { terms_of_service: "required" };

    try {
      await stripe.paymentLinks.update(paymentLinkId, tosPayload);
      return { status: "updated" };
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError;
      if (isConsentParameterUnknown(stripeError)) {
        return {
          status: "manual_required",
          reason: stripeError?.message,
        };
      }
      throw error;
    }
  }
