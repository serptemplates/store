import { createHash } from "node:crypto";

import logger from "@/lib/logger";
import { normalizeEmail } from "@/lib/checkout/utils";
import { findCheckoutSessionByStripeSessionId, updateCheckoutSessionStatus } from "@/lib/checkout";
import type { NormalizedOrderUrls } from "@/lib/payments/order-fulfillment";

const CRISP_API_BASE_URL = "https://api.crisp.chat/v1";

type CrispTier = "plugin" | "user";

type CrispConfig = {
  websiteId: string;
  identifier: string;
  key: string;
  tier: CrispTier;
};

type CrispResponse<T> = {
  error: boolean;
  reason?: string;
  data?: T;
};

class CrispRequestError extends Error {
  status: number;
  reason?: string;
  payload?: unknown;

  constructor(message: string, status: number, reason?: string, payload?: unknown) {
    super(message);
    this.name = "CrispRequestError";
    this.status = status;
    this.reason = reason;
    this.payload = payload;
  }
}

type CrispPurchaseContext = {
  sessionId: string;
  offerId: string;
  productName?: string | null;
  customerEmail: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  provider: string;
  providerMode?: "live" | "test" | null;
  providerSessionId?: string | null;
  providerPaymentId?: string | null;
  providerChargeId?: string | null;
  licenseId?: string | null;
  licenseKey?: string | null;
  licenseTier?: string | null;
  licenseEntitlements?: string[] | null;
  urls?: NormalizedOrderUrls;
};

export type CrispSyncResult = {
  status: "synced" | "skipped" | "error";
  reason?: string;
  peopleId?: string;
};

function coalesceEnv(value: string | undefined | null): string {
  return value?.trim() ?? "";
}

function resolveTier(raw: string | undefined | null): CrispTier {
  return raw === "user" ? "user" : "plugin";
}

function getCrispConfig(): CrispConfig | null {
  const websiteId = coalesceEnv(process.env.CRISP_WEBSITE_ID);
  const identifier =
    coalesceEnv(process.env.CRISP_API_TOKEN_IDENTIFIER) ||
    coalesceEnv(process.env.CRISP_API_DEVELOPMENT_TOKEN_IDENTIFIER);
  const key =
    coalesceEnv(process.env.CRISP_API_TOKEN_KEY) ||
    coalesceEnv(process.env.CRISP_API_DEVELOPMENT_TOKEN_KEY);
  const tier = resolveTier(coalesceEnv(process.env.CRISP_API_TIER) || coalesceEnv(process.env.CRISP_TIER));

  if (!websiteId || !identifier || !key) {
    return null;
  }

  return { websiteId, identifier, key, tier };
}

function maskValue(value: string, visible = 4): string {
  if (!value) return "";
  if (value.length <= visible) return "*".repeat(value.length);
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function buildAuthHeader(config: CrispConfig): string {
  const token = Buffer.from(`${config.identifier}:${config.key}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

function compactRecord<T extends Record<string, unknown>>(record: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === "") continue;
    result[key] = value;
  }
  return result;
}

function formatMajorAmount(amountTotal: number | null | undefined): number | null {
  if (typeof amountTotal !== "number" || !Number.isFinite(amountTotal)) {
    return null;
  }
  return Number((amountTotal / 100).toFixed(2));
}

async function crispRequest<T>(
  config: CrispConfig,
  path: string,
  options: { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown },
): Promise<T | null> {
  const response = await fetch(`${CRISP_API_BASE_URL}${path}`, {
    method: options.method,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: buildAuthHeader(config),
      "X-Crisp-Tier": config.tier,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as CrispResponse<T> | null;

  if (!response.ok || !payload || payload.error) {
    throw new CrispRequestError(
      `Crisp API request failed (${response.status}).`,
      response.status,
      payload?.reason,
      payload ?? null,
    );
  }

  return payload.data ?? null;
}

function buildPeopleId(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

function extractEmailDomain(email: string): string | null {
  const atIndex = email.indexOf("@");
  if (atIndex === -1) return null;
  return email.slice(atIndex + 1) || null;
}

function serializeError(error: unknown): { message: string; name?: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, name: error.name, stack: error.stack };
  }
  return { message: String(error) };
}

export async function syncCrispPurchase(context: CrispPurchaseContext): Promise<CrispSyncResult> {
  const config = getCrispConfig();
  if (!config) {
    logger.info("crisp.sync_skipped", {
      reason: "missing_config",
      hasWebsiteId: Boolean(coalesceEnv(process.env.CRISP_WEBSITE_ID)),
      hasIdentifier:
        Boolean(coalesceEnv(process.env.CRISP_API_TOKEN_IDENTIFIER)) ||
        Boolean(coalesceEnv(process.env.CRISP_API_DEVELOPMENT_TOKEN_IDENTIFIER)),
      hasKey:
        Boolean(coalesceEnv(process.env.CRISP_API_TOKEN_KEY)) ||
        Boolean(coalesceEnv(process.env.CRISP_API_DEVELOPMENT_TOKEN_KEY)),
    });
    return { status: "skipped", reason: "missing_config" };
  }

  if (context.providerMode !== "live") {
    logger.debug("crisp.sync_skipped", {
      reason: "non_live",
      sessionId: context.sessionId,
      offerId: context.offerId,
      providerMode: context.providerMode ?? null,
    });
    return { status: "skipped", reason: "non_live" };
  }

  const normalizedEmail = context.customerEmail ? normalizeEmail(context.customerEmail) : "";
  if (!normalizedEmail) {
    logger.info("crisp.sync_skipped", {
      reason: "missing_email",
      sessionId: context.sessionId,
      offerId: context.offerId,
    });
    return { status: "skipped", reason: "missing_email" };
  }

  const peopleId = buildPeopleId(normalizedEmail);
  let stage = "preflight";

  try {
    stage = "lookup_session";
    const existingSession = await findCheckoutSessionByStripeSessionId(context.sessionId);
    const existingMetadata = (existingSession?.metadata ?? {}) as Record<string, unknown>;
    const alreadySynced =
      typeof existingMetadata.crispSyncedAt === "string" || existingMetadata.crispPeopleId === peopleId;

    if (alreadySynced) {
      logger.info("crisp.sync_skipped", {
        reason: "already_synced",
        sessionId: context.sessionId,
        peopleId,
      });
      return { status: "skipped", reason: "already_synced", peopleId };
    }

    const emailDomain = extractEmailDomain(normalizedEmail);
    const nickname = context.customerName?.trim() || undefined;
    const phone = context.customerPhone?.trim() || undefined;
    const amountMajor = formatMajorAmount(context.amountTotal);

    const eventData = compactRecord({
      orderId: context.sessionId,
      offerId: context.offerId,
      productName: context.productName ?? context.offerId,
      paymentProvider: context.provider,
      providerMode: context.providerMode ?? null,
      providerSessionId: context.providerSessionId ?? context.sessionId,
      providerPaymentId: context.providerPaymentId ?? null,
      providerChargeId: context.providerChargeId ?? null,
      paymentStatus: context.paymentStatus ?? null,
      paymentMethod: context.paymentMethod ?? null,
      amountCents: context.amountTotal ?? null,
      amount: amountMajor,
      currency: context.currency ?? null,
      licenseId: context.licenseId ?? null,
      licenseKey: context.licenseKey ?? null,
      licenseTier: context.licenseTier ?? null,
      licenseEntitlements: context.licenseEntitlements ?? undefined,
      productPageUrl: context.urls?.productPageUrl ?? null,
      purchaseUrl: context.urls?.purchaseUrl ?? null,
      storeProductPageUrl: context.urls?.storeProductPageUrl ?? null,
      appsProductPageUrl: context.urls?.appsProductPageUrl ?? null,
      serplyLink: context.urls?.serplyLink ?? null,
      successUrl: context.urls?.successUrl ?? null,
      cancelUrl: context.urls?.cancelUrl ?? null,
    });

    logger.info("crisp.sync_started", {
      sessionId: context.sessionId,
      offerId: context.offerId,
      peopleId,
      emailDomain,
      websiteId: maskValue(config.websiteId),
    });

    stage = "profile";
    const profilePayload = {
      email: normalizedEmail,
      person: compactRecord({
        nickname,
        phone,
      }),
    };

    await crispRequest(config, `/website/${config.websiteId}/people/profile/${peopleId}`, {
      method: "PUT",
      body: profilePayload,
    });

    logger.info("crisp.profile_saved", {
      sessionId: context.sessionId,
      peopleId,
      websiteId: maskValue(config.websiteId),
    });

    stage = "data";
    const dataPayload = {
      data: compactRecord({
        type: "customer",
        signup: "finished",
        email: normalizedEmail,
        nickname,
        phone_number: phone,
        metadata: eventData,
      }),
    };

    await crispRequest(config, `/website/${config.websiteId}/people/data/${peopleId}`, {
      method: "PUT",
      body: dataPayload,
    });

    logger.info("crisp.data_saved", {
      sessionId: context.sessionId,
      peopleId,
      websiteId: maskValue(config.websiteId),
    });

    stage = "event";
    const eventPayload = {
      text: "Checkout purchase",
      color: "green",
      data: eventData,
    };

    await crispRequest(config, `/website/${config.websiteId}/people/events/${peopleId}`, {
      method: "POST",
      body: eventPayload,
    });

    logger.info("crisp.event_added", {
      sessionId: context.sessionId,
      peopleId,
      websiteId: maskValue(config.websiteId),
    });

    stage = "metadata_update";
    await updateCheckoutSessionStatus(context.sessionId, "completed", {
      metadata: {
        crispSyncedAt: new Date().toISOString(),
        crispPeopleId: peopleId,
        crispEventText: eventPayload.text,
      },
    });

    logger.info("crisp.sync_succeeded", {
      sessionId: context.sessionId,
      peopleId,
      websiteId: maskValue(config.websiteId),
    });

    return { status: "synced", peopleId };
  } catch (error) {
    logger.error("crisp.sync_failed", {
      sessionId: context.sessionId,
      peopleId,
      websiteId: maskValue(config.websiteId),
      error: serializeError(error),
      stage,
      reason: error instanceof CrispRequestError ? error.reason : undefined,
      status: error instanceof CrispRequestError ? error.status : undefined,
    });
    return { status: "error", peopleId };
  }
}
