import type Stripe from "stripe";

import logger from "@/lib/logger";

export function handleUnhandledStripeEvent(event: Stripe.Event) {
  logger.debug("webhook.unhandled_event", { eventType: event.type });
}
