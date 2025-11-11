"use server";

import { NextRequest, NextResponse } from "next/server";

import logger from "@/lib/logger";
import { ensureAccountForPurchase } from "@/lib/account/service";
import { recordWebhookLog } from "@/lib/webhook-logs";
import { upsertOrder } from "@/lib/checkout";
import { ensureDatabase, setDatabaseConnectionOverride } from "@/lib/database";

const WEBHOOK_SECRET = process.env.GHL_PAYMENT_WEBHOOK_SECRET;
const DB_OVERRIDE_HEADER = "x-preview-db-url";
const DB_OVERRIDE_TOKEN_HEADER = "x-preview-db-token";

type JsonRecord = Record<string, unknown>;

function toRecord<T extends JsonRecord = JsonRecord>(value: unknown): T {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as T;
  }
  return {} as T;
}

function coalesceString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function parseJsonBody(body: unknown) {
  const payload = toRecord(body);

  const possibleCustom = [
    payload["customData"],
    payload["custom_data"],
    payload["custom_payload"],
    payload["CustomData"],
    payload["customPayload"],
  ];
  const customData = toRecord(possibleCustom.find((item) => item && typeof item === "object"));

  const possibleContact = [
    payload["contact"],
    payload["customer"],
    payload["Contact"],
    payload["Customer"],
  ];
  const contact = toRecord(possibleContact.find((item) => item && typeof item === "object"));

  const payment = toRecord(payload["payment"]);

  const paymentKeys = (...keys: string[]): unknown[] => keys.map((key) => payment[key]);
  const customKeys = (...keys: string[]): unknown[] => keys.map((key) => customData[key]);
  const payloadKeys = (...keys: string[]): unknown[] => keys.map((key) => payload[key]);
  const contactKeys = (...keys: string[]): unknown[] => keys.map((key) => contact[key]);

  const contactId = coalesceString(
    ...customKeys("contact_id", "customer_id"),
    ...payloadKeys("contact_id", "contactId"),
    ...contactKeys("id"),
  );

  const transactionId = coalesceString(
    ...customKeys("transaction_id", "transactionId"),
    ...payloadKeys("transaction_id", "transactionId"),
    ...paymentKeys("transaction_id", "transactionId"),
    ...customKeys("payment_id"),
    ...paymentKeys("id"),
  );

  const paymentId = coalesceString(
    ...customKeys("payment_id"),
    ...paymentKeys("id"),
    ...payloadKeys("payment_id"),
  );

  const paymentStatus = coalesceString(
    ...customKeys("payment_status", "status"),
    ...paymentKeys("payment_status", "status"),
    ...payloadKeys("status"),
  );

  const totalAmount = coalesceString(
    ...customKeys("total_amount", "amount"),
    ...paymentKeys("total_amount", "amount"),
    ...payloadKeys("total_amount"),
  );

  const currency = coalesceString(
    ...customKeys("currency_code", "currency"),
    ...paymentKeys("currency_code", "currency"),
    ...payloadKeys("currency_code", "currency"),
  );

  const customerEmail = coalesceString(
    ...customKeys("customer_email", "email"),
    ...contactKeys("email"),
    ...payloadKeys("customer_email", "contact_email"),
  );

  const customerName = coalesceString(
    ...customKeys("customer_name", "name"),
    ...contactKeys("name"),
    `${coalesceString(...contactKeys("firstName", "first_name")) ?? ""} ${
      coalesceString(...contactKeys("lastName", "last_name")) ?? ""
    }`.trim(),
  );

  const paymentSource = coalesceString(
    ...customKeys("payment_source", "source"),
    ...paymentKeys("source"),
    ...payloadKeys("payment_source", "source"),
  );

  const couponCode = coalesceString(
    ...customKeys("coupon_code"),
    ...paymentKeys("coupon_code"),
    ...payloadKeys("coupon_code"),
  );

  const offerId = coalesceString(
    ...customKeys("offer_id", "offerId", "product_id", "productId", "product_slug", "productSlug"),
    ...payloadKeys("offer_id", "offerId", "product_id", "productId"),
  );

  const createdAt = coalesceString(
    ...customKeys("created_on"),
    ...paymentKeys("created_on"),
    ...payloadKeys("created_on", "createdAt"),
  );

  return {
    payload,
    customData,
    contact,
    payment,
    transactionId,
    paymentId,
    paymentStatus,
    totalAmount,
    currency,
    customerEmail,
    customerName,
    paymentSource,
    couponCode,
    createdAt,
    contactId,
    offerId,
  };
}

function parseAmountToMinorUnits(rawAmount: string | null): number | null {
  if (!rawAmount) {
    return null;
  }

  const normalized = rawAmount.replace(/[^0-9.,-]/g, "").replace(/,/g, "");

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
}

function normalizeCurrencyCode(rawCurrency: string | null): string | null {
  if (!rawCurrency) {
    return null;
  }

  const trimmed = rawCurrency.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.toUpperCase();
}

function scrubPreviewOverrides(record: JsonRecord | null | undefined) {
  if (!record) {
    return;
  }

  delete record["__previewDbOverride"];
  delete record["__previewDbToken"];
}

function normalizeOverrideCandidate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("://")) {
    return trimmed;
  }

  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8").trim();
    if (
      decoded &&
      decoded.includes("://") &&
      /^[\u0020-\u007E]+$/.test(decoded.replace(/\s+/g, " "))
    ) {
      return decoded;
    }
  } catch {
    // ignore decode errors; fall back to trimmed
  }

  return trimmed;
}

function resolveDbOverride(
  request: NextRequest,
  customData: JsonRecord | null | undefined,
  payload: JsonRecord | null | undefined,
): string | null {
  const overrides: string[] = [];
  const headerOverride = request.headers.get(DB_OVERRIDE_HEADER);
  if (headerOverride) {
    overrides.push(normalizeOverrideCandidate(headerOverride));
  }

  const searchParams = request.nextUrl?.searchParams;
  const encodedOverride = searchParams?.get("previewDbOverride");
  if (encodedOverride) {
    try {
      overrides.push(normalizeOverrideCandidate(Buffer.from(encodedOverride, "base64").toString("utf8")));
    } catch (error) {
      logger.warn("ghl.webhook.db_override_decode_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (customData) {
    const candidate = customData["__previewDbOverride"];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      overrides.push(normalizeOverrideCandidate(candidate));
    }
  }

  if (payload) {
    const candidate = payload["__previewDbOverride"];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      overrides.push(normalizeOverrideCandidate(candidate));
    }
  }

  const override = overrides.find((value) => value && value.trim().length > 0);
  if (!override) {
    return null;
  }

  const token =
    request.headers.get(DB_OVERRIDE_TOKEN_HEADER) ??
    searchParams?.get("previewDbToken") ??
    (typeof customData?.["__previewDbToken"] === "string"
      ? (customData["__previewDbToken"] as string)
      : typeof payload?.["__previewDbToken"] === "string"
        ? (payload["__previewDbToken"] as string)
        : undefined);
  const allowedTokens = [
    process.env.TEST_ACCOUNT_ADMIN_TOKEN,
    process.env.ACCOUNT_ADMIN_TOKEN,
  ].filter((value): value is string => Boolean(value && value.trim().length > 0));

  if (allowedTokens.length > 0) {
    if (!token) {
      logger.warn("ghl.webhook.db_override_rejected", { reason: "missing_token" });
      return null;
    }

    if (!allowedTokens.includes(token)) {
      logger.warn("ghl.webhook.db_override_rejected", { reason: "invalid_token" });
      return null;
    }
  } else if (!token) {
    logger.warn("ghl.webhook.db_override_no_token_configured");
  }

  const vercelEnv = process.env.VERCEL_ENV ?? "";
  const host = request.headers.get("host") ?? "";
  if (vercelEnv === "production" && host === "apps.serp.co") {
    logger.warn("ghl.webhook.db_override_rejected", { reason: "production_env" });
    return null;
  }

  return override;
}

export async function POST(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
  }

  if (WEBHOOK_SECRET) {
    const providedSecret = request.headers.get("x-webhook-secret");
    if (!providedSecret || providedSecret !== WEBHOOK_SECRET) {
      logger.warn("ghl.webhook.secret_mismatch", {
        hasHeader: Boolean(providedSecret),
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    logger.warn("ghl.webhook.secret_missing_in_env");
  }

  let data: unknown;
  try {
    data = await request.json();
  } catch (error) {
    logger.error("ghl.webhook.invalid_json", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = parseJsonBody(data);

  const identifier = parsed.transactionId ?? parsed.paymentId;
  logger.info("ghl.webhook.payload", {
    identifier,
    status: parsed.paymentStatus,
    totalAmount: parsed.totalAmount,
    currency: parsed.currency,
    payload: parsed.payload,
    customData: parsed.customData,
    contact: parsed.contact,
    payment: parsed.payment,
    contactId: parsed.contactId,
  });

  const resolvedIdentifier =
    identifier ??
    parsed.contactId ??
    `ghl_${Date.now()}`;

  if (!identifier) {
    logger.warn("ghl.webhook.missing_identifier", {
      contactId: parsed.contactId,
      keys: Object.keys(parsed.customData ?? {}),
    });
  }

  const normalizedStatus = (parsed.paymentStatus ?? "").toLowerCase();
  const successStatuses = new Set(["success", "succeeded", "paid", "complete", "completed"]);
  const webhookStatus =
    normalizedStatus && normalizedStatus.length > 0 && !successStatuses.has(normalizedStatus)
      ? "error"
      : "success";

  const dbOverride = resolveDbOverride(request, parsed.customData, parsed.payload);
  scrubPreviewOverrides(parsed.customData);
  scrubPreviewOverrides(parsed.payload);
  if (dbOverride) {
    setDatabaseConnectionOverride(dbOverride);
    logger.info("ghl.webhook.db_override_enabled", {
      identifier: resolvedIdentifier,
      host: request.headers.get("host"),
    });
  }

  try {
    let dbReady = false;
    try {
      dbReady = await ensureDatabase();
    } catch (error) {
      logger.error("ghl.webhook.database_error", {
        identifier: resolvedIdentifier,
        error: error instanceof Error ? error.message : String(error),
      });
      const responseBody: Record<string, unknown> = { error: "Database unavailable" };
      if (dbOverride) {
        responseBody.override = true;
      }
      return NextResponse.json(responseBody, { status: 500 });
    }

    if (!dbReady) {
      logger.error("ghl.webhook.database_unavailable", {
        identifier: resolvedIdentifier,
      });
      const responseBody: Record<string, unknown> = { error: "Database unavailable" };
      if (dbOverride) {
        responseBody.override = true;
      }
      return NextResponse.json(responseBody, { status: 500 });
    }

    try {
      await recordWebhookLog({
        paymentIntentId: `ghl_${resolvedIdentifier}`,
        stripeSessionId: null,
        eventType: "ghl.payment.received",
        offerId: null,
        landerId: null,
        status: webhookStatus,
        metadata: {
          source: parsed.paymentSource ?? "ghl",
          paymentStatus: parsed.paymentStatus,
          transactionId: parsed.transactionId,
          paymentId: parsed.paymentId,
          contactId: parsed.contactId,
          totalAmount: parsed.totalAmount,
          currency: parsed.currency,
          couponCode: parsed.couponCode,
          createdAt: parsed.createdAt,
          customerEmail: parsed.customerEmail,
          customerName: parsed.customerName,
          offerId: parsed.offerId,
          contact: parsed.contact,
          customData: parsed.customData,
          payment: parsed.payment,
        },
      });

      logger.info("ghl.webhook.received", {
        status: webhookStatus,
        identifier: resolvedIdentifier,
        paymentStatus: parsed.paymentStatus,
        totalAmount: parsed.totalAmount,
        currency: parsed.currency,
      });

      const ghlPaymentIntentId = `ghl_${resolvedIdentifier}`;

      await upsertOrder({
        stripePaymentIntentId: ghlPaymentIntentId,
        stripeSessionId: ghlPaymentIntentId,
        offerId: parsed.offerId ?? null,
        landerId: parsed.offerId ?? null,
        customerEmail: parsed.customerEmail ?? null,
        customerName: parsed.customerName ?? null,
        amountTotal: parseAmountToMinorUnits(parsed.totalAmount),
        currency: normalizeCurrencyCode(parsed.currency),
        metadata: {
          ghl: {
            transactionId: parsed.transactionId,
            paymentId: parsed.paymentId,
            contactId: parsed.contactId,
            couponCode: parsed.couponCode,
            paymentStatus: parsed.paymentStatus,
            paymentSource: parsed.paymentSource,
            customData: parsed.customData ?? null,
            payment: parsed.payment ?? null,
          },
        },
        paymentStatus: parsed.paymentStatus ?? null,
        paymentMethod: parsed.paymentSource ?? "ghl_checkout",
        source: "ghl",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("ghl.webhook.processing_failed", {
        identifier: resolvedIdentifier,
        offerId: parsed.offerId,
        error: message,
      });
      return NextResponse.json(
        {
          error: "Failed to process webhook",
          detail: message,
        },
        { status: 500 },
      );
    }

    if (parsed.customerEmail) {
      try {
        await ensureAccountForPurchase({
          email: parsed.customerEmail,
          name: parsed.customerName ?? null,
          offerId: parsed.offerId ?? null,
        });
      } catch (error) {
        logger.error("ghl.webhook.account_sync_failed", {
          email: parsed.customerEmail,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      logger.warn("ghl.webhook.missing_email_for_account", {
        identifier: resolvedIdentifier,
      });
    }

    return NextResponse.json({ ok: true });
  } finally {
    if (dbOverride) {
      setDatabaseConnectionOverride(null);
      logger.info("ghl.webhook.db_override_cleared", {
        identifier: resolvedIdentifier,
        host: request.headers.get("host"),
      });
    }
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
