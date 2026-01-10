import { randomUUID } from "node:crypto";

import { ensureDatabase, query } from "@/lib/database";

export type WebhookLogStatus = "pending" | "success" | "error";

export type WebhookLogRecordInput = {
  paymentIntentId: string;
  stripeSessionId?: string | null;
  eventType?: string | null;
  offerId?: string | null;
  landerId?: string | null;
  status: WebhookLogStatus;
  message?: string | null;
  lastError?: string | null;
  metadata?: Record<string, unknown> | null;
};

function toJsonbLiteral(payload?: Record<string, unknown> | null): string {
  if (!payload || Object.keys(payload).length === 0) {
    return "{}";
  }

  try {
    return JSON.stringify(payload);
  } catch (error) {
    console.warn("[webhook-log] Failed to serialize metadata", { error });
    return "{}";
  }
}

type WebhookLogRow = {
  status: WebhookLogStatus;
  attempts: number;
};

export type WebhookLogRecord = {
  status: WebhookLogStatus;
  attempts: number;
  lastError: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export async function recordWebhookLog(input: WebhookLogRecordInput): Promise<WebhookLogRow | null> {
  if (!input.paymentIntentId) {
    return null;
  }

  const schemaReady = await ensureDatabase();
  if (!schemaReady) {
    return null;
  }

  const attemptsIncrement = input.status === "pending" ? 0 : 1;
  const isSuccess = input.status === "success";
  const isError = input.status === "error";
  const metadataJson = toJsonbLiteral(input.metadata);

  const result = await query<WebhookLogRow>`
    INSERT INTO webhook_logs (
      id,
      payment_intent_id,
      stripe_session_id,
      event_type,
      offer_id,
      lander_id,
      status,
      attempts,
      last_error,
      metadata
    ) VALUES (
      ${randomUUID()},
      ${input.paymentIntentId},
      ${input.stripeSessionId ?? null},
      ${input.eventType ?? null},
      ${input.offerId ?? null},
      ${input.landerId ?? null},
      ${input.status},
      ${attemptsIncrement},
      ${isError ? input.message ?? null : null},
      ${metadataJson}::jsonb
    )
    ON CONFLICT (payment_intent_id) DO UPDATE SET
      stripe_session_id = COALESCE(EXCLUDED.stripe_session_id, webhook_logs.stripe_session_id),
      event_type = COALESCE(EXCLUDED.event_type, webhook_logs.event_type),
      offer_id = COALESCE(EXCLUDED.offer_id, webhook_logs.offer_id),
      lander_id = COALESCE(EXCLUDED.lander_id, webhook_logs.lander_id),
      status = EXCLUDED.status,
      attempts = CASE WHEN ${attemptsIncrement === 0} THEN webhook_logs.attempts ELSE webhook_logs.attempts + ${attemptsIncrement} END,
      last_error = CASE
        WHEN ${isError} THEN EXCLUDED.last_error
        WHEN ${isSuccess} THEN NULL
        ELSE webhook_logs.last_error
      END,
      metadata = COALESCE(webhook_logs.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb),
      last_attempt_at = CASE WHEN ${attemptsIncrement === 0} THEN webhook_logs.last_attempt_at ELSE NOW() END,
      last_success_at = CASE WHEN ${isSuccess} THEN NOW() ELSE webhook_logs.last_success_at END,
      updated_at = NOW()
    RETURNING status, attempts;
  `;

  return result?.rows?.[0] ?? null;
}

export async function findWebhookLogByPaymentIntentId(paymentIntentId: string): Promise<WebhookLogRecord | null> {
  if (!paymentIntentId) {
    return null;
  }

  const schemaReady = await ensureDatabase();
  if (!schemaReady) {
    return null;
  }

  const result = await query<{
    status: WebhookLogStatus;
    attempts: number;
    last_error: string | null;
    metadata: Record<string, unknown> | null;
    created_at: Date;
    updated_at: Date;
  }>`
    SELECT
      status,
      attempts,
      last_error,
      metadata,
      created_at,
      updated_at
    FROM webhook_logs
    WHERE payment_intent_id = ${paymentIntentId}
    LIMIT 1;
  `;

  const row = result?.rows?.[0];
  if (!row) {
    return null;
  }

  return {
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function countErroredWebhookLogsSince(hours: number): Promise<number> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return 0;
  }

  const interval = Math.max(Math.floor(hours), 1);

  const result = await query<{ error_count: string }>`
    SELECT COUNT(*)::int AS error_count
      FROM webhook_logs
     WHERE status = 'error'
       AND updated_at >= NOW() - (${interval}::int * INTERVAL '1 hour');
  `;

  const value = result?.rows?.[0]?.error_count;
  return typeof value === "number" ? value : Number.parseInt(String(value ?? 0), 10) || 0;
}

export async function countPendingWebhookLogsOlderThan(minutes: number): Promise<number> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return 0;
  }

  const interval = Math.max(Math.floor(minutes), 1);

  const result = await query<{ pending_count: string }>`
    SELECT COUNT(*)::int AS pending_count
      FROM webhook_logs
     WHERE status = 'pending'
       AND created_at < NOW() - (${interval}::int * INTERVAL '1 minute');
  `;

  const value = result?.rows?.[0]?.pending_count;
  return typeof value === "number" ? value : Number.parseInt(String(value ?? 0), 10) || 0;
}
