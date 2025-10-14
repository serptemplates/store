import logger from "@/lib/logger";

import {
  ADMIN_TIMEOUT,
  ADMIN_TOKEN,
  ADMIN_URL,
} from "./config";
import { normaliseKey } from "./normalizers";
import { requestJson } from "./request";
import type { LicenseCreationResult } from "./types";

export async function fetchLicenseFromAdmin(email: string): Promise<LicenseCreationResult | null> {
  if (!ADMIN_URL || !ADMIN_TOKEN) {
    return null;
  }

  let url: string;

  try {
    const parsed = new URL(ADMIN_URL);
    parsed.pathname = "/admin/licenses";
    parsed.search = `email=${encodeURIComponent(email)}`;
    url = parsed.toString();
  } catch (error) {
    logger.error("license_service.admin_url_invalid", {
      endpoint: ADMIN_URL,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  try {
    const data = await requestJson(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      timeout: ADMIN_TIMEOUT,
    });

    const licenseKey = normaliseKey(data);
    const licenseId = typeof data.licenseId === "string" ? data.licenseId : null;
    const action = typeof data.action === "string" ? data.action : null;

    if (!licenseKey && !licenseId) {
      return null;
    }

    return {
      action,
      licenseId,
      licenseKey,
      raw: data,
    };
  } catch (error) {
    const status = (error as Error & { status?: number }).status;

    if (status !== 404) {
      logger.error("license_service.lookup_admin_error", {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return null;
  }
}

