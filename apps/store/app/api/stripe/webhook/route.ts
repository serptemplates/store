import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type Stripe from "stripe";

import { PAYMENT_ACCOUNTS } from "@/config/payment-accounts";
import { getStripeClient } from "@/lib/payments/stripe";
import {
  getOptionalStripeWebhookSecret,
  type StripeMode,
} from "@/lib/payments/stripe-environment";
import logger from "@/lib/logger";
import { handleStripeEvent } from "@/lib/payments/stripe-webhook";

type WebhookSecretEntry = {
  secret: string;
  accountAlias: string | null;
  mode: StripeMode;
};

const webhookSecretEntries: WebhookSecretEntry[] = [];

function addSecretEntry(secret: string | undefined, accountAlias: string | null, mode: StripeMode) {
  if (!secret) {
    return;
  }
  if (webhookSecretEntries.some((entry) => entry.secret === secret)) {
    return;
  }
  webhookSecretEntries.push({
    secret,
    accountAlias,
    mode,
  });
}

addSecretEntry(getOptionalStripeWebhookSecret("live"), null, "live");
addSecretEntry(getOptionalStripeWebhookSecret("test"), null, "test");

for (const alias of Object.keys(PAYMENT_ACCOUNTS.stripe)) {
  addSecretEntry(getOptionalStripeWebhookSecret({ mode: "live", accountAlias: alias }), alias, "live");
  addSecretEntry(getOptionalStripeWebhookSecret({ mode: "test", accountAlias: alias }), alias, "test");
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();

  if (webhookSecretEntries.length === 0) {
    return jsonResponse({ error: "Stripe webhook secret not configured" }, 500);
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return jsonResponse({ error: "Missing Stripe signature header" }, 400);
  }

  const rawBody = await req.text();

  let event: Stripe.Event | null = null;

  let lastError: unknown;

  let matchedEntry: WebhookSecretEntry | null = null;

  for (const entry of webhookSecretEntries) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, entry.secret);
      matchedEntry = entry;
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
    await handleStripeEvent(resolvedEvent, {
      accountAlias: matchedEntry?.accountAlias ?? null,
    });
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
