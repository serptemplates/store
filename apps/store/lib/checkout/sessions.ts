import { randomUUID } from "node:crypto";

import { ensureDatabase, query } from "@/lib/database";

import type {
  CheckoutSessionRecord,
  CheckoutSessionStatus,
  CheckoutSessionUpsert,
  CheckoutSource,
} from "./types";
import { normalizeEmail, toJsonbLiteral } from "./utils";

interface CheckoutSessionRow {
  id: string;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  payment_provider: string | null;
  provider_account_alias: string | null;
  provider_session_id: string | null;
  provider_payment_id: string | null;
  provider_charge_id: string | null;
  provider_mode: string | null;
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

function normalizeProvider(value: string | null | undefined): CheckoutSessionRecord["paymentProvider"] {
  if (!value) {
    return null;
  }

  if (value === "ghl") {
    return "ghl";
  }

  if (value === "paypal" || value === "legacy_paypal") {
    return "legacy_paypal";
  }

  return value as CheckoutSessionRecord["paymentProvider"];
}

function normalizeProviderMode(value: string | null | undefined): CheckoutSessionRecord["providerMode"] {
  if (value === "live" || value === "test") {
    return value;
  }
  return null;
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
    paymentProvider: normalizeProvider(row.payment_provider ?? row.source ?? null),
    providerAccountAlias: row.provider_account_alias ?? null,
    providerSessionId: row.provider_session_id ?? row.stripe_session_id,
    providerPaymentId: row.provider_payment_id ?? row.stripe_payment_intent_id,
    providerChargeId: row.provider_charge_id ?? null,
    providerMode: normalizeProviderMode(row.provider_mode),
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
  const paymentProvider = input.paymentProvider ?? source;
  const providerSessionId = input.providerSessionId ?? input.stripeSessionId;
  const providerPaymentId = input.providerPaymentId ?? input.paymentIntentId ?? null;
  const providerChargeId = input.providerChargeId ?? null;

  const result = await query<{ id: string }>`
    INSERT INTO checkout_sessions (
      id,
      stripe_session_id,
      stripe_payment_intent_id,
      payment_provider,
      provider_account_alias,
      provider_session_id,
      provider_payment_id,
      provider_charge_id,
      provider_mode,
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
      ${paymentProvider ?? null},
      ${input.providerAccountAlias ?? null},
      ${providerSessionId},
      ${providerPaymentId ?? null},
      ${providerChargeId ?? null},
      ${input.providerMode ?? null},
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
      payment_provider = COALESCE(EXCLUDED.payment_provider, checkout_sessions.payment_provider),
      provider_account_alias = COALESCE(EXCLUDED.provider_account_alias, checkout_sessions.provider_account_alias),
      provider_session_id = COALESCE(EXCLUDED.provider_session_id, checkout_sessions.provider_session_id),
      provider_payment_id = COALESCE(EXCLUDED.provider_payment_id, checkout_sessions.provider_payment_id),
      provider_charge_id = COALESCE(EXCLUDED.provider_charge_id, checkout_sessions.provider_charge_id),
      provider_mode = COALESCE(EXCLUDED.provider_mode, checkout_sessions.provider_mode),
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
    paymentProvider?: CheckoutSessionRecord["paymentProvider"] | null;
    providerAccountAlias?: string | null;
    providerSessionId?: string | null;
    providerPaymentId?: string | null;
    providerChargeId?: string | null;
    providerMode?: string | null;
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
           payment_provider = COALESCE(${options?.paymentProvider ?? null}, payment_provider),
           provider_account_alias = COALESCE(${options?.providerAccountAlias ?? null}, provider_account_alias),
           provider_session_id = COALESCE(${options?.providerSessionId ?? null}, provider_session_id),
           provider_payment_id = COALESCE(${options?.providerPaymentId ?? null}, provider_payment_id),
           provider_charge_id = COALESCE(${options?.providerChargeId ?? null}, provider_charge_id),
           provider_mode = COALESCE(${options?.providerMode ?? null}, provider_mode),
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

export async function updateCheckoutSessionsCustomerEmail(
  currentEmail: string,
  nextEmail: string,
): Promise<number> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return 0;
  }

  const normalizedCurrent = normalizeEmail(currentEmail);
  const normalizedNext = normalizeEmail(nextEmail);

  if (!normalizedCurrent || !normalizedNext || normalizedCurrent === normalizedNext) {
    return 0;
  }

  const result = await query`
    UPDATE checkout_sessions
       SET customer_email = ${normalizedNext},
           updated_at = NOW()
     WHERE customer_email = ${normalizedCurrent};
  `;

  return result?.rowCount ?? 0;
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
      payment_provider,
      provider_account_alias,
      provider_session_id,
      provider_payment_id,
      provider_charge_id,
      provider_mode,
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
      payment_provider,
      provider_account_alias,
      provider_session_id,
      provider_payment_id,
      provider_charge_id,
      provider_mode,
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
