import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { validateStripeCheckoutSession, validateStripeWebhookEvent } from "@/lib/contracts/webhook.contract";

const secret = process.env.STRIPE_SECRET_KEY_TEST;
const priceId = process.env.STRIPE_TEST_PRICE_ID;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST;

const apiVersion: Stripe.StripeConfig["apiVersion"] = "2024-04-10";

const maybeDescribe = secret && priceId && webhookSecret ? describe : describe.skip;

maybeDescribe("Stripe live integration", () => {
  it("creates a checkout session and validates webhook payload", async () => {
    const stripe = new Stripe(secret!, { apiVersion });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: "https://example.com/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://example.com/cancel",
      line_items: [
        {
          price: priceId!,
          quantity: 1,
        },
      ],
    });

    expect(session.id).toMatch(/^cs_/);
    expect(session.payment_intent).toBeTruthy();

    const sessionPayload = JSON.parse(JSON.stringify(session));
    sessionPayload.amount_subtotal ??= sessionPayload.amount_total;
    sessionPayload.success_url ??= "https://example.com/success";
    sessionPayload.cancel_url ??= "https://example.com/cancel";
    sessionPayload.metadata ??= {};

    const parsedSession = validateStripeCheckoutSession(sessionPayload);
    expect(parsedSession.id).toBe(session.id);

    const eventPayload = {
      id: `evt_test_${Date.now()}`,
      object: "event",
      api_version: apiVersion,
      created: Math.floor(Date.now() / 1_000),
      type: "checkout.session.completed",
      data: {
        object: sessionPayload,
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: null,
        idempotency_key: null,
      },
    } satisfies Stripe.Event;

    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: JSON.stringify(eventPayload),
      secret: webhookSecret!,
    });

    expect(signature).toMatch(/^t=\d+,v1=/);

    const parsedEvent = validateStripeWebhookEvent(eventPayload);
    expect(parsedEvent.type).toBe("checkout.session.completed");

    await stripe.checkout.sessions.expire(session.id).catch(() => {});
  }, 30_000);
});
