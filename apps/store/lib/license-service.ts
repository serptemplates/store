import logger from "@/lib/logger";
import {
  LicenseProviderResponseSchema,
  normaliseLicenseProviderPayload,
  type LicenseProviderPurchase,
} from "@/lib/contracts/license-provider";

/**
 * Minimal license service adapter.
 * BUGFIX: Previous implementation sent the wrong payload to the admin
 * endpoint (missing fields, wrong casing) and never read the key from
 * the admin lookup. This version mirrors the working notebook payload and
 * stores license metadata on every order so the account dashboard renders
 * immediately.
 */

const ADMIN_URL = (process.env.LICENSE_ADMIN_URL ?? process.env.LICENSE_SERVICE_ADMIN_URL ?? "").replace(/\/$/, "");
const ADMIN_TOKEN = process.env.LICENSE_KEY_ADMIN_API_KEY ?? process.env.LICENSE_ADMIN_API_KEY ?? "";
const ADMIN_TIMEOUT = Number(process.env.LICENSE_ADMIN_TIMEOUT_MS ?? 5000);
const ADMIN_PROVIDER = process.env.LICENSE_ADMIN_PROVIDER ?? null;
const ADMIN_EVENT_TYPE = process.env.LICENSE_ADMIN_EVENT_TYPE ?? null;
const ADMIN_RAW_EVENT_SOURCE = process.env.LICENSE_ADMIN_RAW_EVENT_SOURCE ?? "store.checkout";
const ADMIN_PROVIDER_OBJECT_PREFIX = process.env.LICENSE_ADMIN_PROVIDER_OBJECT_PREFIX ?? "order";

const LOOKUP_URL = process.env.LICENSE_SERVICE_URL ?? "";
const LOOKUP_TOKEN = process.env.LICENSE_SERVICE_TOKEN ?? process.env.LICENSE_SERVICE_API_KEY ?? "";
const LOOKUP_TIMEOUT = Number(process.env.LICENSE_SERVICE_TIMEOUT_MS ?? 5000);

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

export interface LicenseCreationInput {
  id: string;
  provider: string;
  providerObjectId?: string | null;
  userEmail: string;
  tier?: string | null;
  entitlements?: string[];
  features?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  status?: string;
  eventType?: string;
  amount?: number | null;
  currency?: string | null;
  expiresAt?: string | null;
  rawEvent?: unknown;
}

export interface LicenseCreationResult {
  action: string | null;
  licenseId: string | null;
  licenseKey: string | null;
  raw: unknown;
}

function normaliseKey(data: Record<string, unknown>): string | null {
  if (typeof data.licenseKey === "string" && data.licenseKey.length > 0) {
    return data.licenseKey;
  }
  if (typeof data.key === "string" && data.key.length > 0) {
    return data.key;
  }
  return null;
}

async function requestJson(url: string, options: RequestInit & { timeout?: number } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 5000);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const error = new Error(`Request failed (${response.status}) ${url}`);
      (error as Error & { status?: number; body?: string }).status = response.status;
      (error as Error & { status?: number; body?: string }).body = body;
      throw error;
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLicenseFromAdmin(email: string): Promise<LicenseCreationResult | null> {
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

export async function fetchLicenseForOrder(input: LicenseLookupInput): Promise<LicenseRecord | null> {
  if (!LOOKUP_URL || !LOOKUP_TOKEN) {
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

export async function createLicenseForOrder(input: LicenseCreationInput): Promise<LicenseCreationResult | null> {
  if (!ADMIN_URL || !ADMIN_TOKEN) {
    logger.debug("license_service.create_skipped", {
      reason: !ADMIN_URL ? "missing_endpoint" : "missing_token",
      provider: input.provider,
      id: input.id,
    });
    return null;
  }

  const entitlements = Array.isArray(input.entitlements)
    ? input.entitlements.map((item) => String(item))
    : [];

  const features =
    input.features && typeof input.features === "object" && !Array.isArray(input.features)
      ? { ...(input.features as Record<string, unknown>) }
      : {};

  const metadata =
    input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
      ? { ...(input.metadata as Record<string, unknown>) }
      : {};

  const rawEvent =
    input.rawEvent && typeof input.rawEvent === "object" && !Array.isArray(input.rawEvent)
      ? { ...(input.rawEvent as Record<string, unknown>) }
      : {};

  const provider = ADMIN_PROVIDER ?? input.provider;
  const providerObjectId =
    input.providerObjectId
    ?? (typeof metadata.providerObjectId === "string" ? metadata.providerObjectId : null)
    ?? `${ADMIN_PROVIDER_OBJECT_PREFIX}-${input.id}`;

  const normalizedId = input.id.startsWith("evt") ? input.id : `evt-${input.id}`;
  const eventType = ADMIN_EVENT_TYPE ?? input.eventType ?? "checkout.completed";
  const status = input.status ?? "completed";

  const amountValue =
    input.amount !== undefined
      ? input.amount
      : typeof metadata.amount === "number"
        ? metadata.amount
        : null;

  const rawCurrency =
    input.currency ?? (typeof metadata.currency === "string" ? metadata.currency : null);
  const currencyValue = rawCurrency ? String(rawCurrency).toLowerCase() : null;

  const payloadDraft: LicenseProviderPurchase = {
    id: normalizedId,
    provider,
    providerObjectId,
    eventType,
    status,
    userEmail: input.userEmail,
    tier: input.tier ?? provider,
    entitlements,
    features,
    metadata,
    amount: amountValue,
    currency: currencyValue,
    rawEvent: Object.keys(rawEvent).length > 0 ? rawEvent : { source: ADMIN_RAW_EVENT_SOURCE },
    expiresAt: input.expiresAt ?? null,
  };

  const payload = normaliseLicenseProviderPayload(payloadDraft);

  const payloadSummary = {
    provider,
    id: normalizedId,
    providerObjectId,
    eventType,
    status,
    userEmail: input.userEmail,
    tier: payload.tier ?? null,
    entitlements,
    entitlementsCount: entitlements.length,
    featuresKeys: Object.keys(features),
    metadataKeys: Object.keys(metadata),
    amount: payload.amount ?? null,
    currency: payload.currency ?? null,
    rawEventKeys: Object.keys(payload.rawEvent as Record<string, unknown>),
  };

  logger.debug("license_service.create_request", payloadSummary);

  try {
    const data = await requestJson(ADMIN_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify(payload),
      timeout: ADMIN_TIMEOUT,
    });

    const parsedResponse = LicenseProviderResponseSchema.safeParse({
      action: data.action ?? null,
      licenseId: data.licenseId ?? null,
      licenseKey: data.licenseKey ?? data.key ?? null,
    });

    if (!parsedResponse.success) {
      logger.warn("license_service.response_unexpected_shape", {
        provider: input.provider,
        id: input.id,
        issues: parsedResponse.error.issues,
      });
    }

    const action = parsedResponse.success
      ? parsedResponse.data.action
      : typeof data.action === "string"
        ? data.action
        : null;
    const licenseId = parsedResponse.success
      ? parsedResponse.data.licenseId
      : typeof data.licenseId === "string"
        ? data.licenseId
        : null;
    let licenseKey = parsedResponse.success ? parsedResponse.data.licenseKey : normaliseKey(data);

    if (!licenseKey) {
      const existing = await fetchLicenseFromAdmin(input.userEmail);
      if (existing?.licenseKey) {
        licenseKey = existing.licenseKey;
      }
    }

    logger.info("license_service.create_success", {
      provider: input.provider,
      id: input.id,
      action,
      licenseId,
      hasLicenseKey: Boolean(licenseKey),
    });

    return {
      action,
      licenseId,
      licenseKey,
      raw: data,
    };
  } catch (error) {
    const status = (error as Error & { status?: number }).status;

    const body = (error as Error & { body?: string }).body;

    logger.error("license_service.create_error", {
      provider: input.provider,
      id: input.id,
      status,
      body: typeof body === "string" ? body.slice(0, 2000) : null,
      error: error instanceof Error ? error.message : String(error),
      payloadSummary,
    });

    const fallback = await fetchLicenseFromAdmin(input.userEmail);

    if (fallback?.licenseKey) {
      logger.warn("license_service.fallback_license", {
        provider: input.provider,
        id: input.id,
      });
      return fallback;
    }

    return null;
  }
}
