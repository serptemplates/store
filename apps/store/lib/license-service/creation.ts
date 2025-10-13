import logger from "@/lib/logger";
import {
  LicenseProviderResponseSchema,
  normaliseLicenseProviderPayload,
  type LicenseProviderPurchase,
} from "@/lib/contracts/license-provider";

import {
  ADMIN_EVENT_TYPE,
  ADMIN_PROVIDER,
  ADMIN_PROVIDER_OBJECT_PREFIX,
  ADMIN_RAW_EVENT_SOURCE,
  ADMIN_TIMEOUT,
  ADMIN_TOKEN,
  ADMIN_URL,
} from "./config";
import { fetchLicenseFromAdmin } from "./admin";
import {
  normaliseExpiresAt,
  normaliseKey,
  normaliseStatus,
} from "./normalizers";
import { requestJson } from "./request";
import type {
  LicenseCreationInput,
  LicenseCreationResult,
  LicenseRevocationInput,
} from "./types";

export async function markLicenseAsRefunded(input: LicenseRevocationInput): Promise<LicenseCreationResult | null> {
  const reason = input.reason?.trim() || "refund";
  const eventId = input.eventId.startsWith("evt") ? input.eventId : `evt-${input.eventId}`;

  const metadata = {
    ...(input.metadata ?? {}),
    revocationReason: reason,
    originalEventId: input.originalEventId ?? null,
  };

  const rawEvent = {
    ...(input.rawEvent ?? {}),
    source: (input.rawEvent && typeof input.rawEvent.source === "string"
      ? input.rawEvent.source
      : "license.refund"),
    reason,
  };

  return createLicenseForOrder({
    id: eventId,
    provider: input.provider,
    providerObjectId: input.providerObjectId ?? null,
    userEmail: input.userEmail,
    tier: input.tier ?? undefined,
    entitlements: input.entitlements ?? [],
    features: input.features ?? undefined,
    metadata,
    status: "refunded",
    eventType: "license.refunded",
    amount: input.amount ?? null,
    currency: input.currency ?? null,
    rawEvent,
  });
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
  const status = normaliseStatus(input.status);

  const amountValue =
    input.amount !== undefined
      ? input.amount
      : typeof metadata.amount === "number"
        ? metadata.amount
        : null;

  const rawCurrency =
    input.currency ?? (typeof metadata.currency === "string" ? metadata.currency : null);
  const currencyValue = rawCurrency ? String(rawCurrency).toLowerCase() : null;

  const expiresAt = normaliseExpiresAt(
    input.expiresAt
      ?? (typeof metadata.expiresAt === "number" || typeof metadata.expiresAt === "string"
        ? metadata.expiresAt
        : null)
  );

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
    expiresAt,
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

