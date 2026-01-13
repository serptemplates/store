import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { query } from "@/lib/database";
import { sendOpsAlert } from "@/lib/notifications/ops";
import { grantSerpAuthEntitlements } from "@/lib/serp-auth/entitlements";
import { recordWebhookLog } from "@/lib/webhook-logs";

export const runtime = "nodejs";

function extractAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const headerToken = request.headers.get("x-monitoring-token");
  if (headerToken) {
    return headerToken.trim();
  }

  return null;
}

function parseBoolean(value: string | null): boolean {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
}

function parseNumber(
  value: string | null,
  fallback: number,
  options?: { min?: number; max?: number },
): number {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  const min = options?.min ?? 1;
  const max = options?.max ?? Number.MAX_SAFE_INTEGER;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function parseEntitlements(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const values = raw
    .split(/[,\s]+/g)
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(values));
}

type RetryRow = {
  payment_intent_id: string;
  stripe_session_id: string | null;
  webhook_offer_id: string | null;
  session_offer_id: string | null;
  customer_email: string | null;
  license_entitlements_resolved: string | null;
};

export async function GET(request: NextRequest) {
  const expectedToken = process.env.MONITORING_TOKEN?.trim();
  if (expectedToken) {
    const provided = extractAuthToken(request);
    if (!provided || provided !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const limit = parseNumber(url.searchParams.get("limit"), 8, { min: 1, max: 50 });
  const lookbackHours = parseNumber(url.searchParams.get("lookbackHours"), 24, { min: 1, max: 168 });
  const dryRun = parseBoolean(url.searchParams.get("dryRun"));
  const shouldAlert = parseBoolean(url.searchParams.get("alert"));

  let scanned = 0;
  let attempted = 0;
  let succeeded = 0;
  let failed = 0;
  let skippedMissingEmail = 0;
  let skippedMissingEntitlements = 0;
  let skippedMissingSecret = 0;

  const rows = await query<RetryRow>`
    SELECT
      wl.payment_intent_id,
      wl.stripe_session_id,
      wl.offer_id as webhook_offer_id,
      COALESCE(wl.metadata->>'license_entitlements_resolved', wl.metadata->>'licenseEntitlementsResolved') as license_entitlements_resolved,
      cs.offer_id as session_offer_id,
      cs.customer_email
    FROM webhook_logs wl
    LEFT JOIN checkout_sessions cs
      ON cs.stripe_session_id = wl.stripe_session_id
      OR cs.stripe_payment_intent_id = wl.payment_intent_id
    WHERE wl.status = 'error'
      AND wl.updated_at > NOW() - (${lookbackHours}::int * INTERVAL '1 hour')
      AND (wl.metadata->'serpAuthEntitlementsGrant'->>'status') = 'failed'
    ORDER BY wl.updated_at DESC
    LIMIT ${limit};
  `;

  for (const row of rows?.rows ?? []) {
    scanned += 1;
    const email = row.customer_email?.trim() ?? "";
    if (!email) {
      skippedMissingEmail += 1;
      continue;
    }

    const entitlements = parseEntitlements(row.license_entitlements_resolved);
    if (entitlements.length === 0) {
      const fallback = row.webhook_offer_id ?? row.session_offer_id ?? null;
      if (fallback) {
        entitlements.push(fallback);
      }
    }

    if (entitlements.length === 0) {
      skippedMissingEntitlements += 1;
      continue;
    }

    attempted += 1;

    if (dryRun) {
      continue;
    }

    const grantResult = await grantSerpAuthEntitlements({
      email,
      entitlements,
      metadata: {
        source: "entitlements-retry",
        retry: true,
        paymentIntentId: row.payment_intent_id,
        stripeSessionId: row.stripe_session_id ?? null,
        offerId: row.webhook_offer_id ?? row.session_offer_id ?? null,
      },
      context: {
        provider: "stripe",
        providerSessionId: row.stripe_session_id ?? null,
      },
    });

    const attemptedAt = new Date().toISOString();

    if (grantResult.status === "succeeded") {
      succeeded += 1;
      await recordWebhookLog({
        paymentIntentId: row.payment_intent_id,
        stripeSessionId: row.stripe_session_id ?? null,
        eventType: "checkout.session.completed",
        offerId: row.webhook_offer_id ?? row.session_offer_id ?? null,
        landerId: null,
        status: "success",
        message: "SERP Auth entitlements grant retry succeeded",
        metadata: {
          serpAuthEntitlementsGrant: {
            status: "succeeded",
            httpStatus: grantResult.httpStatus,
            retry: true,
            attemptedAt,
          },
        },
      });
    } else if (grantResult.status === "skipped") {
      if (grantResult.reason === "missing_internal_secret") {
        skippedMissingSecret += 1;
      }
      failed += 1;
      await recordWebhookLog({
        paymentIntentId: row.payment_intent_id,
        stripeSessionId: row.stripe_session_id ?? null,
        eventType: "checkout.session.completed",
        offerId: row.webhook_offer_id ?? row.session_offer_id ?? null,
        landerId: null,
        status: "error",
        message: "SERP Auth entitlements grant retry skipped",
        metadata: {
          serpAuthEntitlementsGrant: {
            status: "skipped",
            reason: grantResult.reason,
            retry: true,
            attemptedAt,
          },
        },
      });
    } else {
      failed += 1;
      await recordWebhookLog({
        paymentIntentId: row.payment_intent_id,
        stripeSessionId: row.stripe_session_id ?? null,
        eventType: "checkout.session.completed",
        offerId: row.webhook_offer_id ?? row.session_offer_id ?? null,
        landerId: null,
        status: "error",
        message: "SERP Auth entitlements grant retry failed",
        metadata: {
          serpAuthEntitlementsGrant: {
            status: "failed",
            httpStatus: grantResult.httpStatus,
            error: grantResult.error?.message ?? null,
            retry: true,
            attemptedAt,
          },
        },
      });
    }
  }

  if (shouldAlert && failed > 0) {
    await sendOpsAlert("SERP Auth entitlements retry failures", {
      scanned,
      attempted,
      succeeded,
      failed,
      skippedMissingEmail,
      skippedMissingEntitlements,
      skippedMissingSecret,
      lookbackHours,
      limit,
      dryRun,
    });
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    scanned,
    attempted,
    succeeded,
    failed,
    skippedMissingEmail,
    skippedMissingEntitlements,
    skippedMissingSecret,
    lookbackHours,
    limit,
    timestamp: new Date().toISOString(),
  });
}
