import type Stripe from "stripe";

import logger from "@/lib/logger";
import type { StripeWebhookContext } from "@/lib/payments/stripe-webhook/types";

export async function handleChargeDisputeClosed(
  dispute: Stripe.Dispute,
  context?: StripeWebhookContext,
) {
  logger.info("stripe.charge_dispute_closed_no_regrant", {
    disputeId: dispute.id ?? null,
    status: dispute.status ?? null,
    accountAlias: context?.accountAlias ?? null,
  });
}
