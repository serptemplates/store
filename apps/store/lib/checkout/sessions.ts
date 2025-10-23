import { randomUUID } from "node:crypto";

import { ensureDatabase, query } from "@/lib/database";

import type {
  CheckoutSessionRecord,
  CheckoutSessionStatus,
  CheckoutSessionUpsert,
  CheckoutSource,
} from "./types";
import { toJsonbLiteral } from "./utils";

interface CheckoutSessionRow {
  id: string;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  offer_id: string;
  lander_id: string | null;
  customer_email: string | null;
  metadata: unknown;
  status: CheckoutSessionStatus;
  source: string | null;
  created_at: string;
  updated_at: string;
}

function normalizeSource(value: string | null | undefined): CheckoutSource {
  if (value === "ghl") {
    return "ghl";
  }

  if (value === "paypal" || value === "legacy_paypal") {
    return "legacy_paypal";
  }

  return "stripe";
}

function mapCheckoutSessionRow(row?: CheckoutSessionRow | null): CheckoutSessionRecord | null {
  if (!row) {
    return null;
  }

  let metadata: Record<string, unknown> = {};

  if (typeof row.metadata === "string") {
    try {
      metadata = JSON.parse(row.metadata) as Record<string, unknown>;
    } catch {
      metadata = {};
    }
  } else if (row.metadata && typeof row.metadata === "object") {
    metadata = row.metadata as Record<string, unknown>;
  }

  return {
    id: row.id,
    stripeSessionId: row.stripe_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    offerId: row.offer_id,
    landerId: row.lander_id,
    customerEmail: row.customer_email,
    metadata,
    status: row.status,
    source: normalizeSource(row.source),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function upsertCheckoutSession(input: CheckoutSessionUpsert): Promise<string | null> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return null;
  }

  const metadataJson = toJsonbLiteral(input.metadata);
  const status = input.status ?? "pending";
  const source =
    input.source === "legacy_paypal"
      ? "paypal"
      : input.source ?? "stripe";

  const result = await query<{ id: string }>`
    INSERT INTO checkout_sessions (
      id,
      stripe_session_id,
      stripe_payment_intent_id,
      offer_id,
      lander_id,
      customer_email,
      metadata,
      status,
      source
    ) VALUES (
      ${randomUUID()},
      ${input.stripeSessionId},
      ${input.paymentIntentId ?? null},
      ${input.offerId},
      ${input.landerId ?? null},
      ${input.customerEmail ?? null},
      ${metadataJson}::jsonb,
      ${status},
      ${source}
    )
    ON CONFLICT (stripe_session_id) DO UPDATE SET
      stripe_payment_intent_id = COALESCE(EXCLUDED.stripe_payment_intent_id, checkout_sessions.stripe_payment_intent_id),
      offer_id = EXCLUDED.offer_id,
      lander_id = COALESCE(EXCLUDED.lander_id, checkout_sessions.lander_id),
      customer_email = COALESCE(EXCLUDED.customer_email, checkout_sessions.customer_email),
      metadata = COALESCE(checkout_sessions.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb),
      status = EXCLUDED.status,
      source = EXCLUDED.source,
      updated_at = NOW()
    RETURNING id;
  `;

  return result?.rows?.[0]?.id ?? null;
}

export async function updateCheckoutSessionStatus(
  stripeSessionId: string,
  status: CheckoutSessionStatus,
  options?: {
    paymentIntentId?: string | null;
    customerEmail?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return;
  }

  const metadataJson = toJsonbLiteral(options?.metadata);

  await query`
    UPDATE checkout_sessions
       SET status = ${status},
           stripe_payment_intent_id = COALESCE(${options?.paymentIntentId ?? null}, stripe_payment_intent_id),
           customer_email = COALESCE(${options?.customerEmail ?? null}, customer_email),
           metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(${metadataJson}::jsonb, '{}'::jsonb),
           updated_at = NOW()
     WHERE stripe_session_id = ${stripeSessionId};
  `;
}

export async function markStaleCheckoutSessions(hours = 24): Promise<void> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return;
  }

  const interval = Math.max(hours, 1);

  await query`
    UPDATE checkout_sessions
       SET status = 'abandoned',
           updated_at = NOW()
     WHERE status = 'pending'
       AND created_at < NOW() - (${interval}::int * INTERVAL '1 hour');
  `;
}

export async function findCheckoutSessionByStripeSessionId(stripeSessionId: string): Promise<CheckoutSessionRecord | null> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return null;
  }

  const result = await query<CheckoutSessionRow>`
    SELECT
      id,
      stripe_session_id,
      stripe_payment_intent_id,
      offer_id,
      lander_id,
      customer_email,
      metadata,
      status,
      source,
      created_at,
      updated_at
    FROM checkout_sessions
    WHERE stripe_session_id = ${stripeSessionId}
    LIMIT 1;
  `;

  return mapCheckoutSessionRow(result?.rows?.[0] ?? null);
}

export async function findCheckoutSessionByPaymentIntentId(paymentIntentId: string): Promise<CheckoutSessionRecord | null> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return null;
  }

  const result = await query<CheckoutSessionRow>`
    SELECT
      id,
      stripe_session_id,
      stripe_payment_intent_id,
      offer_id,
      lander_id,
      customer_email,
      metadata,
      status,
      source,
      created_at,
      updated_at
    FROM checkout_sessions
    WHERE stripe_payment_intent_id = ${paymentIntentId}
    LIMIT 1;
  `;

  return mapCheckoutSessionRow(result?.rows?.[0] ?? null);
}
