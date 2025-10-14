import { randomUUID } from "node:crypto";

import { ensureDatabase, query } from "@/lib/database";

import type { CheckoutOrderUpsert, CheckoutSessionStatus, CheckoutSource, OrderRecord } from "./types";
import { normalizeEmail, toJsonbLiteral } from "./utils";

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
  checkout_session_status?: string | null;
  checkout_session_source?: string | null;
  created_at: string;
  updated_at: string;
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

  const checkoutSessionStatus = row.checkout_session_status ?? null;
  const checkoutSessionSource = row.checkout_session_source ?? null;

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
    checkoutSessionStatus: checkoutSessionStatus as CheckoutSessionStatus | null,
    checkoutSessionSource: checkoutSessionSource as CheckoutSource | null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
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

export async function findOrdersByEmailAndSource(
  email: string,
  source: CheckoutSource,
): Promise<OrderRecord[]> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return [];
  }

  const normalizedEmail = normalizeEmail(email);

  const result = await query<OrderRow>`
    SELECT
      o.id,
      o.checkout_session_id,
      o.stripe_session_id,
      o.stripe_payment_intent_id,
      o.stripe_charge_id,
      o.amount_total,
      o.currency,
      o.offer_id,
      o.lander_id,
      o.customer_email,
      o.customer_name,
      o.metadata,
      o.payment_status,
      o.payment_method,
      o.source,
      o.created_at,
      o.updated_at,
      cs.status AS checkout_session_status,
      cs.source AS checkout_session_source
    FROM orders o
    LEFT JOIN checkout_sessions cs
      ON (
        cs.id = o.checkout_session_id
        OR cs.stripe_session_id IS NOT DISTINCT FROM o.stripe_session_id
        OR cs.stripe_payment_intent_id IS NOT DISTINCT FROM o.stripe_payment_intent_id
      )
    WHERE o.customer_email = ${normalizedEmail}
      AND o.source = ${source}
  `;

  const rows = result?.rows ?? [];
  return rows
    .map((row) => mapOrderRow(row))
    .filter((order): order is OrderRecord => Boolean(order));
}

export async function deleteOrderById(orderId: string): Promise<boolean> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return false;
  }

  const result = await query`
    DELETE FROM orders
    WHERE id = ${orderId}
  `;

  return Boolean(result?.rowCount);
}

export async function updateOrderMetadata(
  lookupKey: { stripePaymentIntentId?: string | null; stripeSessionId?: string | null },
  metadata: Record<string, unknown>,
): Promise<boolean> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return false;
  }

  const metadataJson = toJsonbLiteral(metadata);

  if (lookupKey.stripePaymentIntentId) {
    const result = await query`
      UPDATE orders
      SET metadata = COALESCE(orders.metadata, '{}'::jsonb) || ${metadataJson}::jsonb,
          updated_at = NOW()
      WHERE stripe_payment_intent_id = ${lookupKey.stripePaymentIntentId}
      RETURNING id;
    `;

    if (result?.rows?.length) {
      return true;
    }
  }

  if (lookupKey.stripeSessionId) {
    const result = await query`
      UPDATE orders
      SET metadata = COALESCE(orders.metadata, '{}'::jsonb) || ${metadataJson}::jsonb,
          updated_at = NOW()
      WHERE stripe_session_id = ${lookupKey.stripeSessionId}
      RETURNING id;
    `;

    return Boolean(result?.rows?.length);
  }

  return false;
}

export async function findOrderByPaymentIntentId(paymentIntentId: string): Promise<OrderRecord | null> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return null;
  }

  const result = await query<OrderRow>`
    SELECT
      o.id,
      o.checkout_session_id,
      o.stripe_session_id,
      o.stripe_payment_intent_id,
      o.stripe_charge_id,
      o.amount_total,
      o.currency,
      o.offer_id,
      o.lander_id,
      o.customer_email,
      o.customer_name,
      o.metadata,
      o.payment_status,
      o.payment_method,
      o.source,
      o.created_at,
      o.updated_at,
      cs.status AS checkout_session_status,
      cs.source AS checkout_session_source
    FROM orders o
    LEFT JOIN checkout_sessions cs
      ON (
        cs.id = o.checkout_session_id
        OR cs.stripe_session_id IS NOT DISTINCT FROM o.stripe_session_id
        OR cs.stripe_payment_intent_id IS NOT DISTINCT FROM o.stripe_payment_intent_id
      )
    WHERE o.stripe_payment_intent_id = ${paymentIntentId}
    LIMIT 1;
  `;

  return mapOrderRow(result?.rows?.[0] ?? null);
}

export async function findOrderByPaypalOrderId(paypalOrderId: string): Promise<OrderRecord | null> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return null;
  }

  const trimmed = paypalOrderId.trim();
  if (!trimmed) {
    return null;
  }

  const result = await query<OrderRow>`
    SELECT
      o.id,
      o.checkout_session_id,
      o.stripe_session_id,
      o.stripe_payment_intent_id,
      o.stripe_charge_id,
      o.amount_total,
      o.currency,
      o.offer_id,
      o.lander_id,
      o.customer_email,
      o.customer_name,
      o.metadata,
      o.payment_status,
      o.payment_method,
      o.source,
      o.created_at,
      o.updated_at,
      cs.status AS checkout_session_status,
      cs.source AS checkout_session_source
    FROM orders o
    LEFT JOIN checkout_sessions cs
      ON (
        cs.id = o.checkout_session_id
        OR cs.stripe_session_id IS NOT DISTINCT FROM o.stripe_session_id
        OR cs.stripe_payment_intent_id IS NOT DISTINCT FROM o.stripe_payment_intent_id
      )
    WHERE o.source = 'paypal'
      AND (
        o.metadata ->> 'paypalOrderId' = ${trimmed}
        OR o.metadata ->> 'paypal_order_id' = ${trimmed}
        OR o.stripe_session_id = ${`paypal_${trimmed}`}
      )
    ORDER BY o.created_at DESC
    LIMIT 1;
  `;

  return mapOrderRow(result?.rows?.[0] ?? null);
}

export async function findLatestGhlOrder(params: {
  offerId?: string | null;
  customerEmail?: string | null;
  excludePaymentIntentId?: string | null;
}): Promise<OrderRecord | null> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return null;
  }

  const normalizedEmail = params.customerEmail ? normalizeEmail(params.customerEmail) : null;
  const offerId = params.offerId?.trim() ?? null;
  const excludePaymentIntentId = params.excludePaymentIntentId?.trim() ?? null;

  const result = await query<OrderRow>`
    SELECT
      o.id,
      o.checkout_session_id,
      o.stripe_session_id,
      o.stripe_payment_intent_id,
      o.stripe_charge_id,
      o.amount_total,
      o.currency,
      o.offer_id,
      o.lander_id,
      o.customer_email,
      o.customer_name,
      o.metadata,
      o.payment_status,
      o.payment_method,
      o.source,
      o.created_at,
      o.updated_at,
      cs.status AS checkout_session_status,
      cs.source AS checkout_session_source
    FROM orders o
    LEFT JOIN checkout_sessions cs
      ON (
        cs.id = o.checkout_session_id
        OR cs.stripe_session_id IS NOT DISTINCT FROM o.stripe_session_id
        OR cs.stripe_payment_intent_id IS NOT DISTINCT FROM o.stripe_payment_intent_id
      )
    WHERE o.source = 'ghl'
      AND (${offerId}::text IS NULL OR o.offer_id = ${offerId})
      AND (${normalizedEmail}::text IS NULL OR lower(o.customer_email) = ${normalizedEmail})
      AND (${excludePaymentIntentId}::text IS NULL OR o.stripe_payment_intent_id <> ${excludePaymentIntentId})
    ORDER BY o.created_at DESC
    LIMIT 1;
  `;

  return mapOrderRow(result?.rows?.[0] ?? null);
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
      o.id,
      o.checkout_session_id,
      o.stripe_session_id,
      o.stripe_payment_intent_id,
      o.stripe_charge_id,
      o.amount_total,
      o.currency,
      o.offer_id,
      o.lander_id,
      o.customer_email,
      o.customer_name,
      o.metadata,
      o.payment_status,
      o.payment_method,
      o.source,
      o.created_at,
      o.updated_at,
      cs.status AS checkout_session_status,
      cs.source AS checkout_session_source
    FROM orders o
    LEFT JOIN checkout_sessions cs
      ON (
        cs.id = o.checkout_session_id
        OR cs.stripe_session_id IS NOT DISTINCT FROM o.stripe_session_id
        OR cs.stripe_payment_intent_id IS NOT DISTINCT FROM o.stripe_payment_intent_id
      )
    WHERE o.customer_email IS NOT NULL
      AND LOWER(o.customer_email) = ${normalizedEmail}
    ORDER BY o.created_at DESC
    LIMIT ${safeLimit};
  `;

  const rows = result?.rows ?? [];
  const orders = rows.map((row) => mapOrderRow(row)).filter(Boolean) as OrderRecord[];

  return orders;
}

export async function findRefundedOrders(options?: { limit?: number; skipIfMetadataFlag?: string }): Promise<OrderRecord[]> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return [];
  }

  const safeLimit = Math.min(Math.max(Math.floor(options?.limit ?? 200), 1), 1000);

  const result = await query<OrderRow>`
    SELECT
      o.id,
      o.checkout_session_id,
      o.stripe_session_id,
      o.stripe_payment_intent_id,
      o.stripe_charge_id,
      o.amount_total,
      o.currency,
      o.offer_id,
      o.lander_id,
      o.customer_email,
      o.customer_name,
      o.metadata,
      o.payment_status,
      o.payment_method,
      o.source,
      o.created_at,
      o.updated_at,
      cs.status AS checkout_session_status,
      cs.source AS checkout_session_source
    FROM orders o
    LEFT JOIN checkout_sessions cs
      ON (
        cs.id = o.checkout_session_id
        OR cs.stripe_session_id IS NOT DISTINCT FROM o.stripe_session_id
        OR cs.stripe_payment_intent_id IS NOT DISTINCT FROM o.stripe_payment_intent_id
      )
    WHERE o.payment_status IS NOT NULL
      AND o.payment_status ILIKE '%refund%'
    ORDER BY o.updated_at DESC
    LIMIT ${safeLimit};
  `;

  const orders = (result?.rows ?? [])
    .map((row) => mapOrderRow(row))
    .filter((record): record is OrderRecord => Boolean(record));

  const flagKey = options?.skipIfMetadataFlag;

  if (!flagKey) {
    return orders;
  }

  return orders.filter((order) => {
    const flagValue = order.metadata?.[flagKey];
    if (flagValue === null || flagValue === undefined) {
      return true;
    }

    if (typeof flagValue === "boolean") {
      return !flagValue;
    }

    if (typeof flagValue === "string") {
      return flagValue.trim().length === 0;
    }

    return false;
  });
}
