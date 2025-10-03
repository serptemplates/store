import logger from "@/lib/logger";

export interface LicenseLookupInput {
  email: string;
  offerId: string | null;
  orderId: string;
  source: string;
}

export interface LicenseRecord {
  licenseKey: string;
  status?: string | null;
  url?: string | null;
  raw?: unknown;
}

function getLicenseEndpoint(): string | null {
  return process.env.LICENSE_SERVICE_URL ?? null;
}

function getLicenseAuthToken(): string | null {
  return process.env.LICENSE_SERVICE_TOKEN ?? process.env.LICENSE_SERVICE_API_KEY ?? null;
}

export async function fetchLicenseForOrder(input: LicenseLookupInput): Promise<LicenseRecord | null> {
  const endpoint = getLicenseEndpoint();

  if (!endpoint) {
    logger.debug("license_service.disabled", {
      orderId: input.orderId,
      offerId: input.offerId,
      reason: "Missing LICENSE_SERVICE_URL",
    });
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.LICENSE_SERVICE_TIMEOUT_MS ?? 5000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(getLicenseAuthToken() ? { Authorization: `Bearer ${getLicenseAuthToken()}` } : {}),
      },
      body: JSON.stringify({
        email: input.email,
        offerId: input.offerId,
        orderId: input.orderId,
        source: input.source,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn("license_service.lookup_failed", {
        status: response.status,
        offerId: input.offerId,
        orderId: input.orderId,
      });
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const licenseKey = typeof data.licenseKey === "string" ? data.licenseKey : null;

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
    logger.error("license_service.lookup_error", {
      offerId: input.offerId,
      orderId: input.orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
