import { afterAll, beforeAll, describe, expect, it, vi, type MockInstance } from "vitest";
import { NextRequest } from "next/server";

import { loadIntegrationEnv } from "./utils/env";

loadIntegrationEnv(import.meta.url);

const paypalModule = await import("@/lib/paypal");
const { POST: captureOrderRoute } = await import("@/app/api/paypal/capture-order/route");
const { ensureDatabase, isDatabaseConfigured, query } = await import("@/lib/database");
const {
  upsertCheckoutSession,
  findCheckoutSessionByStripeSessionId,
} = await import("@/lib/checkout-store");
const { getOfferConfig } = await import("@/lib/offer-config");

const paypalConfigured = Boolean(
  process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET,
);
const ghlToken = process.env.GHL_PAT_LOCATION ?? process.env.GHL_API_TOKEN;
const ghlLocation = process.env.GHL_LOCATION_ID;
const databaseReady = isDatabaseConfigured();

if (!paypalConfigured || !ghlToken || !ghlLocation || !databaseReady) {
  // eslint-disable-next-line no-console
  console.warn(
    "[integration] PayPal → GHL test skipped (missing PayPal, DATABASE, or GHL credentials)",
  );
}

const maybeDescribe =
  paypalConfigured && ghlToken && ghlLocation && databaseReady ? describe : describe.skip;

maybeDescribe("PayPal checkout to GHL integration", () => {
  const integrationOfferId = process.env.STRIPE_INTEGRATION_OFFER_ID ?? "loom-video-downloader";

type CaptureSpy = MockInstance<typeof paypalModule.capturePayPalOrder>;

let captureSpy: CaptureSpy | null = null;
  let sessionId: string | null = null;

  beforeAll(async () => {
    await ensureDatabase();
    captureSpy = vi.spyOn(paypalModule, "capturePayPalOrder");
  });

  afterAll(async () => {
    if (sessionId) {
      await query`DELETE FROM orders WHERE stripe_session_id = ${sessionId};`;
      await query`DELETE FROM checkout_sessions WHERE stripe_session_id = ${sessionId};`;
    }

    if (captureSpy) {
      captureSpy.mockRestore();
    }
  });

  it(
    "captures a PayPal order, persists it, and syncs the purchase into GHL",
    async () => {
      const offerConfig = getOfferConfig(integrationOfferId);
      expect(offerConfig, `Offer config missing for ${integrationOfferId}`).not.toBeNull();

      const runId = `integration-${Date.now()}`;
      const orderId = `test-paypal-${runId}`;
      sessionId = `paypal_${orderId}`;
      const customerEmail = `paypal+${runId}@serp.co`;
      const customerName = "Integration Tester";
      const affiliateId = `aff${Date.now()}`;

      await upsertCheckoutSession({
        stripeSessionId: sessionId,
        offerId: integrationOfferId,
        landerId: integrationOfferId,
        customerEmail,
        metadata: {
          affiliateId,
          testRunId: runId,
        },
        status: "pending",
        source: "paypal",
      });

      const fakeCaptureId = `CAP-${runId}`;
      const fakeCaptureResult = {
        status: "COMPLETED",
        payer: {
          email_address: customerEmail,
          name: {
            given_name: "Integration",
            surname: "Tester",
          },
        },
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: fakeCaptureId,
                  amount: {
                    value: "17.00",
                    currency_code: "USD",
                  },
                },
              ],
            },
          },
        ],
      } satisfies Awaited<ReturnType<typeof paypalModule.capturePayPalOrder>>;

      captureSpy?.mockResolvedValue(fakeCaptureResult);

      const request = new NextRequest("http://localhost/api/paypal/capture-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const response = await captureOrderRoute(request);
      expect(response.status).toBe(200);

      const payload = (await response.json()) as {
        orderId: string;
        status: string;
        payer: { email: string | null | undefined };
      };

      expect(payload.orderId).toBe(orderId);
      expect(payload.status).toBe("COMPLETED");
      expect(payload.payer.email).toBe(customerEmail);
      expect(captureSpy).toHaveBeenCalledWith(orderId);

      const storedOrder = await query<{
        customer_email: string;
        metadata: Record<string, unknown>;
        source: string;
        amount_total: number;
      }>`
        SELECT customer_email, metadata, source, amount_total
          FROM orders
         WHERE stripe_session_id = ${sessionId}
         ORDER BY created_at DESC
         LIMIT 1;
      `;

      expect(storedOrder?.rowCount).toBe(1);
      const orderRow = storedOrder?.rows[0];
      expect(orderRow?.customer_email).toBe(customerEmail);
      expect(orderRow?.source).toBe("paypal");
      expect(Number(orderRow?.amount_total)).toBe(1700);
      expect(orderRow?.metadata?.paypalOrderId).toBe(orderId);
      expect(orderRow?.metadata?.paypalCaptureId).toBe(fakeCaptureId);
      expect(orderRow?.metadata?.affiliateId).toBe(affiliateId);

      const sessionRecord = await findCheckoutSessionByStripeSessionId(sessionId);
      expect(sessionRecord?.status).toBe("completed");
      const sessionMetadata = (sessionRecord?.metadata ?? {}) as Record<string, unknown>;
      expect(sessionMetadata.affiliateId).toBe(affiliateId);
      expect(sessionMetadata.paypalOrderId).toBe(orderId);
      expect(typeof sessionMetadata.ghlSyncedAt).toBe("string");
      expect((sessionMetadata.ghlContactId as string | undefined)?.length ?? 0).toBeGreaterThan(0);
    },
    60_000,
  );
});
