import logger from "@/lib/logger";

import {
  LOOKUP_TIMEOUT,
  LOOKUP_TOKEN,
  LOOKUP_URL,
  isLicenseLookupConfigured,
} from "./config";
import { normaliseKey } from "./normalizers";
import { requestJson } from "./request";
import type { LicenseLookupInput, LicenseRecord } from "./types";

export async function fetchLicenseForOrder(input: LicenseLookupInput): Promise<LicenseRecord | null> {
  if (!isLicenseLookupConfigured()) {
    logger.debug("license_service.disabled", {
      orderId: input.orderId,
      offerId: input.offerId,
      reason: "Missing LICENSE_SERVICE_URL or token",
    });
    return null;
  }

  try {
    const payload = {
      email: input.email,
      offerId: input.offerId,
      orderId: input.orderId,
      source: input.source,
    };

    const data = await requestJson(LOOKUP_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${LOOKUP_TOKEN}`,
      },
      body: JSON.stringify(payload),
      timeout: LOOKUP_TIMEOUT,
    });

    const licenseKey = normaliseKey(data);
    if (!licenseKey) {
      return null;
    }

    return {
      licenseKey,
      status: typeof data.status === "string" ? data.status : null,
      url: typeof data.url === "string" ? data.url : null,
      raw: data,
    };
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    const body = (error as Error & { body?: string }).body;

    logger.error("license_service.lookup_error", {
      offerId: input.offerId,
      orderId: input.orderId,
      status,
      body: typeof body === "string" ? body.slice(0, 2000) : null,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
