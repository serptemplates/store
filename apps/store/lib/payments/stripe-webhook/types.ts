import type Stripe from "stripe";

export type StripeWebhookContext = {
  accountAlias?: string | null;
};

export type StripeWebhookEventMeta = {
  id?: string;
  type?: string;
  created?: number;
};

export type StripeMetadataRecord = Record<string, string>;
export type StripeMetadataInput = Stripe.Metadata | null | undefined;
export type StripeWebhookRecordMetadata = Record<string, unknown>;

export type StripeChargeReference = Stripe.Dispute["charge"] | null | undefined;

export type StripeWebhookHandler = (
  event: Stripe.Event,
  context?: StripeWebhookContext,
) => Promise<void>;
