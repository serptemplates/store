import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type Stripe from "stripe";

import { getStripeClient } from "@/lib/payments/stripe";
import { getOptionalStripeWebhookSecret } from "@/lib/payments/stripe-environment";
import logger from "@/lib/logger";
import { handleStripeEvent } from "@/lib/payments/stripe-webhook";

const webhookSecret = getOptionalStripeWebhookSecret();

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();

  if (!webhookSecret) {
    return jsonResponse({ error: "Stripe webhook secret not configured" }, 500);
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return jsonResponse({ error: "Missing Stripe signature header" }, 400);
  }

  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Unable to construct Stripe event";
    return jsonResponse({ error: message }, 400);
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    logger.error("webhook.event_processing_failed", {
      eventId: event.id,
      type: event.type,
      error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
    });
    return jsonResponse({ error: "Failed to process event" }, 500);
  }

  return jsonResponse({ received: true });
}

export const runtime = "nodejs";
