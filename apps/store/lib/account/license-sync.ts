import type { AccountRecord } from "@/lib/account/store";
import { fetchContactLicensesByEmail } from "@/lib/ghl-client";
import { upsertOrder, findOrdersByEmailAndSource, deleteOrderById } from "@/lib/checkout/orders";
import type { GhlLicenseRecord } from "@/lib/ghl-client/types";
import logger from "@/lib/logger";

const PAYMENT_INTENT_PREFIX = "ghl_license:";

function buildPaymentIntentId(license: GhlLicenseRecord): string | null {
  const key = typeof license.key === "string" ? license.key.trim() : "";

  if (!key) {
    return null;
  }

  return `${PAYMENT_INTENT_PREFIX}${key.toLowerCase()}`;
}

export async function syncAccountLicensesFromGhl(account: AccountRecord): Promise<void> {
  const email = account.email?.trim().toLowerCase();

  if (!email) {
    logger.debug("account.ghl_sync.skipped_missing_email", { accountId: account.id });
    return;
  }

  let licenses: GhlLicenseRecord[];

  try {
    licenses = await fetchContactLicensesByEmail(email);
  } catch (error) {
    logger.warn("account.ghl_sync.fetch_failed", {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const keepIds = new Set<string>();
  const syncedAt = new Date().toISOString();

  for (const license of licenses) {
    const paymentIntentId = buildPaymentIntentId(license);

    if (!paymentIntentId) {
      continue;
    }

    keepIds.add(paymentIntentId);

    try {
      await upsertOrder({
        stripePaymentIntentId: paymentIntentId,
        customerEmail: email,
        customerName: account.name ?? null,
        offerId: license.offerId ?? license.tier ?? null,
        metadata: {
          ghlLicense: license,
          ghlSyncedAt: syncedAt,
        },
        paymentStatus: license.action ?? null,
        paymentMethod: "ghl",
        source: "ghl",
      });
    } catch (error) {
      logger.warn("account.ghl_sync.upsert_failed", {
        email,
        paymentIntentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  let existingOrders;
  try {
    existingOrders = await findOrdersByEmailAndSource(email, "ghl");
  } catch (error) {
    logger.warn("account.ghl_sync.load_existing_failed", {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  for (const order of existingOrders) {
    const paymentIntentId = order.stripePaymentIntentId;

    if (!paymentIntentId || !keepIds.has(paymentIntentId)) {
      try {
        await deleteOrderById(order.id);
      } catch (error) {
        logger.warn("account.ghl_sync.delete_failed", {
          email,
          orderId: order.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  logger.debug("account.ghl_sync.completed", {
    email,
    licenses: licenses.length,
    retainedOrders: keepIds.size,
    removedOrders: existingOrders.filter((order) => {
      const paymentIntentId = order.stripePaymentIntentId;
      return !paymentIntentId || !keepIds.has(paymentIntentId);
    }).length,
  });
}
