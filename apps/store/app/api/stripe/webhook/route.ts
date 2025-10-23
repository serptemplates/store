import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type Stripe from "stripe";

import { getStripeClient } from "@/lib/payments/stripe";
import { getOptionalStripeWebhookSecret } from "@/lib/payments/stripe-environment";
import logger from "@/lib/logger";
import { handleStripeEvent } from "@/lib/payments/stripe-webhook";

const primarySecret = getOptionalStripeWebhookSecret();
const liveSecret = getOptionalStripeWebhookSecret("live");
const testSecret = getOptionalStripeWebhookSecret("test");

const webhookSecrets = Array.from(
  new Set(
    [primarySecret, liveSecret, testSecret].filter(
      (value): value is string => Boolean(value),
    ),
  ),
);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();

  if (webhookSecrets.length === 0) {
    return jsonResponse({ error: "Stripe webhook secret not configured" }, 500);
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return jsonResponse({ error: "Missing Stripe signature header" }, 400);
  }

  const rawBody = await req.text();

  let event: Stripe.Event | null = null;

  let lastError: unknown;

  for (const secret of webhookSecrets) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!event) {
    const message =
      lastError && typeof lastError === "object" && "message" in lastError
        ? String(lastError.message)
        : "Unable to construct Stripe event";
    return jsonResponse({ error: message }, 400);
  }

  const resolvedEvent = event;

  try {
    await handleStripeEvent(resolvedEvent);
  } catch (error) {
    logger.error("webhook.event_processing_failed", {
      eventId: resolvedEvent.id,
      type: resolvedEvent.type,
      error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
    });
    return jsonResponse({ error: "Failed to process event" }, 500);
  }

  return jsonResponse({ received: true });
}

export const runtime = "nodejs";
