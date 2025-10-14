import Stripe from "stripe";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { loadIntegrationEnv } from "./utils/env";

loadIntegrationEnv(import.meta.url);

const { POST: createCheckoutSession } = await import("@/app/api/checkout/session/route");
const { POST: handleStripeWebhook } = await import("@/app/api/stripe/webhook/route");
const { ensureDatabase, isDatabaseConfigured, query } = await import("@/lib/database");
const { findCheckoutSessionByStripeSessionId } = await import("@/lib/checkout");
const { getOfferConfig } = await import("@/lib/products/offer-config");

const stripeSecret = process.env.STRIPE_SECRET_KEY_TEST ?? process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST ?? process.env.STRIPE_WEBHOOK_SECRET;
const ghlToken = process.env.GHL_PAT_LOCATION ?? process.env.GHL_API_TOKEN;
const ghlLocation = process.env.GHL_LOCATION_ID;

const apiVersion: Stripe.StripeConfig["apiVersion"] = "2024-04-10";
const integrationOfferId = process.env.STRIPE_INTEGRATION_OFFER_ID ?? "loom-video-downloader";

const dependenciesReady =
  Boolean(stripeSecret) &&
  Boolean(webhookSecret) &&
  Boolean(ghlToken) &&
  Boolean(ghlLocation) &&
  isDatabaseConfigured();

if (!dependenciesReady) {
  // eslint-disable-next-line no-console
  console.warn("[integration] Stripe → GHL test skipped (missing STRIPE, DATABASE, or GHL credentials)");
}

const maybeDescribe = dependenciesReady ? describe : describe.skip;

maybeDescribe("Stripe checkout to GHL integration", () => {
  let stripe: Stripe | null = null;
  let sessionId: string | null = null;

  beforeAll(async () => {
    if (!stripeSecret) {
      throw new Error("Stripe secret key is required for integration test");
    }

    stripe = new Stripe(stripeSecret, { apiVersion });
    await ensureDatabase();
  });

  afterAll(async () => {
    if (!sessionId) {
      return;
    }

    await query`DELETE FROM orders WHERE stripe_session_id = ${sessionId};`;
    await query`DELETE FROM checkout_sessions WHERE stripe_session_id = ${sessionId};`;
    await stripe?.checkout.sessions.expire(sessionId).catch(() => undefined);
  });

  it(
    "creates a checkout session and syncs the purchase into GHL via the webhook",
    async () => {
      const offerConfig = getOfferConfig(integrationOfferId);
      expect(offerConfig, `Offer config missing for ${integrationOfferId}`).not.toBeNull();

      const runId = `integration-${Date.now()}`;
      const customerEmail = `integration+${runId}@serp.co`;
      const affiliateId = `aff${Date.now()}`;
      const customerName = "Integration Tester";

      const requestPayload = {
        offerId: integrationOfferId,
        quantity: 1,
        affiliateId,
        metadata: {
          testRunId: runId,
        },
        customer: {
          email: customerEmail,
          name: customerName,
        },
      } satisfies Record<string, unknown>;

      const checkoutRequest = new NextRequest("http://localhost/api/checkout/session", {
        method: "POST",
        body: JSON.stringify(requestPayload),
        headers: { "content-type": "application/json" },
      });

      const checkoutResponse = await createCheckoutSession(checkoutRequest);
      expect(checkoutResponse.status).toBe(200);

      const checkoutBody = (await checkoutResponse.json()) as { id: string; url?: string };
      sessionId = checkoutBody.id;
      expect(sessionId).toMatch(/^cs_/);

      // Allow background persistence to flush
      await new Promise((resolve) => setTimeout(resolve, 750));

      const pendingRecord = await findCheckoutSessionByStripeSessionId(sessionId);
      expect(pendingRecord, "Checkout session not persisted").not.toBeNull();
      expect(pendingRecord?.status).toBe("pending");

      const pendingMetadata = (pendingRecord?.metadata ?? {}) as Record<string, unknown>;
      expect(pendingMetadata.offerId).toBe(integrationOfferId);
      expect(pendingMetadata.affiliateId).toBe(affiliateId);
      expect(pendingMetadata.testRunId).toBe(runId);

      if (!stripe) {
        throw new Error("Stripe client not initialised");
      }

      const sessionDetails = await stripe.checkout.sessions.retrieve(sessionId);

      const amount = sessionDetails.amount_total ?? sessionDetails.amount_subtotal ?? 0;
      expect(amount, "Unable to determine session amount").toBeGreaterThan(0);

      const currency = sessionDetails.currency ?? "usd";
      const paymentIntentId =
        (typeof sessionDetails.payment_intent === "string"
          ? sessionDetails.payment_intent
          : sessionDetails.payment_intent?.id) ?? `pi_test_${runId}`;

      const eventSession: Partial<Stripe.Checkout.Session> = {
        id: sessionId,
        object: "checkout.session",
        mode: offerConfig!.mode ?? "payment",
        status: "complete",
        payment_status: "paid",
        amount_total: amount,
        amount_subtotal: amount,
        currency,
        metadata: sanitizeMetadata({ ...pendingMetadata, affiliateId }),
        client_reference_id: null,
        customer_email: customerEmail,
        customer_details: {
          email: customerEmail,
          name: customerName,
          phone: null,
          address: null,
          tax_exempt: null,
          tax_ids: [],
        },
        payment_intent: paymentIntentId,
        payment_method_types: ["card"],
      };

      const eventPayload = {
        id: `evt_test_${runId}`,
        object: "event",
        api_version: apiVersion,
        created: Math.floor(Date.now() / 1_000),
        type: "checkout.session.completed",
        data: {
          object: eventSession,
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: null,
          idempotency_key: null,
        },
      };

      const rawBody = JSON.stringify(eventPayload);
      const signature = Stripe.webhooks.generateTestHeaderString({
        payload: rawBody,
        secret: webhookSecret!,
      });

      const webhookRequest = new NextRequest("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": signature,
        },
        body: rawBody,
      });

      const webhookResponse = await handleStripeWebhook(webhookRequest);
      expect(webhookResponse.status).toBe(200);
      const webhookBody = (await webhookResponse.json()) as { received?: boolean };
      expect(webhookBody.received).toBe(true);

      const storedOrder = await query<{
        customer_email: string;
        metadata: Record<string, unknown>;
      }>`
        SELECT customer_email, metadata
          FROM orders
         WHERE stripe_session_id = ${sessionId}
         ORDER BY created_at DESC
         LIMIT 1;
      `;

      expect(storedOrder?.rowCount).toBe(1);
      expect(storedOrder?.rows[0]?.customer_email).toBe(customerEmail);

      const finalRecord = await findCheckoutSessionByStripeSessionId(sessionId);
      expect(finalRecord?.status).toBe("completed");
      const finalMetadata = (finalRecord?.metadata ?? {}) as Record<string, unknown>;
      expect(typeof finalMetadata.ghlSyncedAt).toBe("string");
      expect((finalMetadata.ghlContactId as string | undefined)?.length ?? 0).toBeGreaterThan(0);
      expect(finalMetadata.affiliateId).toBe(affiliateId);
    },
    120_000,
  );
});

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, string> {
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) {
      continue;
    }

    output[key] = typeof value === "string" ? value : JSON.stringify(value);
  }

  return output;
}
