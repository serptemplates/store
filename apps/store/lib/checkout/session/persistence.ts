import logger from "@/lib/logger";
import { markStaleCheckoutSessions, upsertCheckoutSession } from "@/lib/checkout";

interface PersistCheckoutSessionParams {
  stripeSessionId: string;
  offerId: string;
  landerId: string;
  paymentIntentId: string | null;
  customerEmail: string | null;
  metadata: Record<string, string>;
}

export async function persistCheckoutSession({
  stripeSessionId,
  offerId,
  landerId,
  paymentIntentId,
  customerEmail,
  metadata,
}: PersistCheckoutSessionParams) {
  try {
    await upsertCheckoutSession({
      stripeSessionId,
      offerId,
      landerId,
      paymentIntentId,
      customerEmail,
      metadata,
      status: "pending",
      source: "stripe",
    });
  } catch (error) {
    logger.error("checkout.session.persist_failed", {
      sessionId: stripeSessionId,
      error: error instanceof Error ? { name: error.name, message: error.message } : error,
    });
  }

  try {
    await markStaleCheckoutSessions();
  } catch (error) {
    logger.error("checkout.session.mark_stale_failed", {
      error: error instanceof Error ? { name: error.name, message: error.message } : error,
    });
  }
}
