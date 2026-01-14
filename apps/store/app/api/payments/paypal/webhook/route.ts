import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { handlePayPalWebhookEvent, type PayPalWebhookEvent } from "@/lib/payments/providers/paypal/webhook";
import { verifyPayPalWebhookSignature } from "@/lib/payments/paypal/api";
import logger from "@/lib/logger";
import { buildPayPalWebhookCandidates, type WebhookCandidate } from "@/lib/payments/paypal/webhook-config";

function missing(field: string) {
  return NextResponse.json({ error: `Missing ${field}` }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const transmissionId = req.headers.get("paypal-transmission-id");
  const transmissionTime = req.headers.get("paypal-transmission-time");
  const certUrl = req.headers.get("paypal-cert-url");
  const authAlgo = req.headers.get("paypal-auth-algo");
  const transmissionSig = req.headers.get("paypal-transmission-sig");

  if (!transmissionId) return missing("paypal-transmission-id");
  if (!transmissionTime) return missing("paypal-transmission-time");
  if (!certUrl) return missing("paypal-cert-url");
  if (!authAlgo) return missing("paypal-auth-algo");
  if (!transmissionSig) return missing("paypal-transmission-sig");

  const rawBody = await req.text();
  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || body === null || typeof (body as { id?: unknown }).id !== "string") {
    return NextResponse.json({ error: "Invalid PayPal event payload" }, { status: 400 });
  }

  const parsedBody = body as Record<string, unknown>;
  const event = parsedBody as PayPalWebhookEvent;

  const candidates = buildPayPalWebhookCandidates();
  if (candidates.length === 0) {
    return NextResponse.json({ error: "PayPal webhook not configured" }, { status: 500 });
  }

  let matched: WebhookCandidate | null = null;

  for (const candidate of candidates) {
    try {
      const verification = await verifyPayPalWebhookSignature({
        body: parsedBody,
        rawBody,
        transmissionId,
        transmissionTime,
        certUrl,
        authAlgo,
        transmissionSig,
        webhookId: candidate.webhookId,
        accountAlias: candidate.alias,
        mode: candidate.mode,
      });
      if (verification === "SUCCESS") {
        matched = candidate;
        break;
      }
    } catch (error) {
      logger.warn("paypal.webhook.verification_attempt_failed", {
        alias: candidate.alias,
        mode: candidate.mode,
        error: error instanceof Error ? { message: error.message } : error,
      });
    }
  }

  if (!matched) {
    return NextResponse.json({ error: "Unable to verify PayPal signature" }, { status: 400 });
  }

  try {
    await handlePayPalWebhookEvent(event, {
      accountAlias: matched.alias,
      mode: matched.mode,
    });
  } catch (error) {
    logger.error("paypal.webhook.processing_failed", {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return NextResponse.json({ error: "Failed to process PayPal webhook" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

export const runtime = "nodejs";
