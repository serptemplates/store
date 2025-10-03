import { randomUUID } from "node:crypto";

import { ensureDatabase, query } from "@/lib/database";

export type CheckoutSource = "stripe" | "paypal";
export type CheckoutSessionStatus = "pending" | "completed" | "failed" | "abandoned";

export interface CheckoutSessionRecord {
  id: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  offerId: string;
  landerId: string | null;
  customerEmail: string | null;
  metadata: Record<string, unknown>;
  status: CheckoutSessionStatus;
  source: CheckoutSource;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckoutSessionUpsert {
  stripeSessionId: string;
  offerId: string;
  landerId?: string | null;
  paymentIntentId?: string | null;
  customerEmail?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: CheckoutSessionStatus;
  source?: CheckoutSource;
}

export interface CheckoutOrderUpsert {
  checkoutSessionId?: string | null;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  offerId?: string | null;
  landerId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  source?: CheckoutSource;
}

const JSON_EMPTY_OBJECT = "{}";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

interface OrderRow {
  id: string;
  checkout_session_id: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  amount_total: number | null;
  currency: string | null;
  offer_id: string | null;
  lander_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  metadata: unknown;
  payment_status: string | null;
  payment_method: string | null;
  source: CheckoutSource | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRecord {
  id: string;
  checkoutSessionId: string | null;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  offerId: string | null;
  landerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  amountTotal: number | null;
  currency: string | null;
  metadata: Record<string, unknown>;
  paymentStatus: string | null;
  paymentMethod: string | null;
  source: CheckoutSource;
  createdAt: Date;
  updatedAt: Date;
}

function mapOrderRow(row?: OrderRow | null): OrderRecord | null {
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
    checkoutSessionId: row.checkout_session_id,
    stripeSessionId: row.stripe_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    stripeChargeId: row.stripe_charge_id,
    offerId: row.offer_id,
    landerId: row.lander_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    amountTotal: row.amount_total,
    currency: row.currency,
    metadata,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    source: (row.source ?? "stripe") as CheckoutSource,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

interface CheckoutSessionRow {
  id: string;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  offer_id: string;
  lander_id: string | null;
  customer_email: string | null;
  metadata: unknown;
  status: CheckoutSessionStatus;
  source: CheckoutSource;
  created_at: string;
  updated_at: string;
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
    source: row.source,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toJsonbLiteral(payload?: Record<string, unknown> | null) {
  const json = payload && Object.keys(payload).length > 0 ? JSON.stringify(payload) : JSON_EMPTY_OBJECT;
  return `${json}`;
}

export async function upsertCheckoutSession(input: CheckoutSessionUpsert): Promise<string | null> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return null;
  }

  const metadataJson = toJsonbLiteral(input.metadata);
  const status = input.status ?? "pending";
  const source = input.source ?? "stripe";

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
  }
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

export async function upsertOrder(input: CheckoutOrderUpsert): Promise<void> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return;
  }

  const metadataJson = toJsonbLiteral(input.metadata);
  const source = input.source ?? "stripe";

  await query`
    INSERT INTO orders (
      id,
      checkout_session_id,
      stripe_session_id,
      stripe_payment_intent_id,
      stripe_charge_id,
      amount_total,
      currency,
      offer_id,
      lander_id,
      customer_email,
      customer_name,
      metadata,
      payment_status,
      payment_method,
      source
    ) VALUES (
      ${randomUUID()},
      ${input.checkoutSessionId ?? null},
      ${input.stripeSessionId ?? null},
      ${input.stripePaymentIntentId ?? null},
      ${input.stripeChargeId ?? null},
      ${input.amountTotal ?? null},
      ${input.currency ?? null},
      ${input.offerId ?? null},
      ${input.landerId ?? null},
      ${input.customerEmail ?? null},
      ${input.customerName ?? null},
      ${metadataJson}::jsonb,
      ${input.paymentStatus ?? null},
      ${input.paymentMethod ?? null},
      ${source}
    )
    ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET
      checkout_session_id = COALESCE(EXCLUDED.checkout_session_id, orders.checkout_session_id),
      stripe_session_id = COALESCE(EXCLUDED.stripe_session_id, orders.stripe_session_id),
      stripe_charge_id = COALESCE(EXCLUDED.stripe_charge_id, orders.stripe_charge_id),
      amount_total = COALESCE(EXCLUDED.amount_total, orders.amount_total),
      currency = COALESCE(EXCLUDED.currency, orders.currency),
      offer_id = COALESCE(EXCLUDED.offer_id, orders.offer_id),
      lander_id = COALESCE(EXCLUDED.lander_id, orders.lander_id),
      customer_email = COALESCE(EXCLUDED.customer_email, orders.customer_email),
      customer_name = COALESCE(EXCLUDED.customer_name, orders.customer_name),
      metadata = COALESCE(orders.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb),
      payment_status = COALESCE(EXCLUDED.payment_status, orders.payment_status),
      payment_method = COALESCE(EXCLUDED.payment_method, orders.payment_method),
      source = EXCLUDED.source,
      updated_at = NOW();
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

export async function countPendingCheckoutSessionsOlderThan(minutes: number): Promise<number> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return 0;
  }

  const interval = Math.max(Math.floor(minutes), 1);

  const result = await query<{ pending_count: string }>`
    SELECT COUNT(*)::int AS pending_count
      FROM checkout_sessions
     WHERE status = 'pending'
       AND created_at < NOW() - (${interval}::int * INTERVAL '1 minute');
  `;

  const value = result?.rows?.[0]?.pending_count;
  return typeof value === "number" ? value : Number.parseInt(String(value ?? 0), 10) || 0;
}

export async function getRecentOrderStats(hours: number): Promise<{
  count: number;
  lastOrderAt: Date | null;
}> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return { count: 0, lastOrderAt: null };
  }

  const interval = Math.max(Math.floor(hours), 1);

  const result = await query<{ order_count: string; last_created_at: string | null }>`
    SELECT COUNT(*)::int AS order_count,
           MAX(created_at) AS last_created_at
      FROM orders
     WHERE created_at >= NOW() - (${interval}::int * INTERVAL '1 hour');
  `;

  const row = result?.rows?.[0];
  const countValue = row?.order_count;
  const count = typeof countValue === "number" ? countValue : Number.parseInt(String(countValue ?? 0), 10) || 0;
  const lastOrderAt = row?.last_created_at ? new Date(row.last_created_at) : null;

  return { count, lastOrderAt };
}

export async function findRecentOrdersByEmail(email: string, limit = 20): Promise<OrderRecord[]> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return [];
  }

  const normalizedEmail = normalizeEmail(email);
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 200);

  const result = await query<OrderRow>`
    SELECT
      id,
      checkout_session_id,
      stripe_session_id,
      stripe_payment_intent_id,
      stripe_charge_id,
      amount_total,
      currency,
      offer_id,
      lander_id,
      customer_email,
      customer_name,
      metadata,
      payment_status,
      payment_method,
      source,
      created_at,
      updated_at
    FROM orders
    WHERE customer_email IS NOT NULL
      AND LOWER(customer_email) = ${normalizedEmail}
    ORDER BY created_at DESC
    LIMIT ${safeLimit};
  `;

  const rows = result?.rows ?? [];
  const orders = rows.map((row) => mapOrderRow(row)).filter(Boolean) as OrderRecord[];

  return orders;
}

export async function findRecentCheckoutSessionsByEmail(email: string, limit = 20): Promise<CheckoutSessionRecord[]> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return [];
  }

  const normalizedEmail = normalizeEmail(email);
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 200);

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
    WHERE customer_email IS NOT NULL
      AND LOWER(customer_email) = ${normalizedEmail}
    ORDER BY created_at DESC
    LIMIT ${safeLimit};
  `;

  const rows = result?.rows ?? [];
  const sessions = rows.map((row) => mapCheckoutSessionRow(row)).filter(Boolean) as CheckoutSessionRecord[];

  return sessions;
}
