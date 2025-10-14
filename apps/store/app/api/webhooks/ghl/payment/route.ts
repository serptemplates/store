"use server";

import { NextRequest, NextResponse } from "next/server";

import logger from "@/lib/logger";
import { ensureAccountForPurchase } from "@/lib/account/service";
import { recordWebhookLog } from "@/lib/webhook-logs";
import { upsertOrder } from "@/lib/checkout";
import { ensureDatabase } from "@/lib/database";

const WEBHOOK_SECRET = process.env.GHL_PAYMENT_WEBHOOK_SECRET;

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

  const dbReady = await ensureDatabase();
  if (!dbReady) {
    logger.error("ghl.webhook.database_unavailable", {
      identifier: resolvedIdentifier,
    });
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

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

  try {
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
      paymentMethod: parsed.paymentSource ?? "ghl_payment_link",
      source: "ghl",
    });
  } catch (error) {
    logger.error("ghl.webhook.order_upsert_failed", {
      identifier: resolvedIdentifier,
      offerId: parsed.offerId,
      error: error instanceof Error ? error.message : String(error),
    });
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
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
