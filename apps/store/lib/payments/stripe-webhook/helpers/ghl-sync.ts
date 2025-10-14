import { setTimeout as sleep } from "node:timers/promises";

import {
  GhlRequestError,
  RETRYABLE_STATUS_CODES,
  syncOrderWithGhl,
} from "@/lib/ghl-client";
import logger from "@/lib/logger";

export const MAX_GHL_SYNC_ATTEMPTS = 3;
export const GHL_SYNC_RETRY_DELAY_MS = 500;

export async function syncOrderWithGhlWithRetry(
  config: Parameters<typeof syncOrderWithGhl>[0],
  context: Parameters<typeof syncOrderWithGhl>[1],
) {
  for (let attempt = 1; attempt <= MAX_GHL_SYNC_ATTEMPTS; attempt += 1) {
    try {
      return await syncOrderWithGhl(config, context);
    } catch (error) {
      const isRetryableError =
        error instanceof GhlRequestError && RETRYABLE_STATUS_CODES.has(error.status ?? 0);

      if (!isRetryableError || attempt === MAX_GHL_SYNC_ATTEMPTS) {
        throw error;
      }

      const delay = GHL_SYNC_RETRY_DELAY_MS * 2 ** (attempt - 1);
      logger.warn("ghl.sync_retry", {
        attempt,
        maxAttempts: MAX_GHL_SYNC_ATTEMPTS,
        delayMs: delay,
        offerId: context.offerId,
        paymentIntentId: context.stripePaymentIntentId ?? null,
        status: (error as GhlRequestError).status,
      });

      await sleep(delay);
    }
  }

  return null;
}
