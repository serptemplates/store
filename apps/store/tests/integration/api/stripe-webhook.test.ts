import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { OfferConfig } from "@/lib/products/offer-config";
import type { CheckoutSessionRecord } from "@/lib/checkout";

vi.hoisted(() => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.SERP_AUTH_INTERNAL_SECRET = "serp_auth_test_secret";
  process.env.SERP_AUTH_BASE_URL = "https://auth.serp.co";
});

vi.mock("node:timers/promises", () => {
  const sleepMock = vi.fn().mockResolvedValue(undefined);
  return {
    setTimeout: sleepMock,
    default: { setTimeout: sleepMock },
  };
});

vi.mock("@/lib/products/offer-config", () => ({
  getOfferConfig: vi.fn(),
}));

vi.mock("@/lib/payments/stripe", () => ({
  getStripeClient: vi.fn(),
}));

vi.mock("@/lib/checkout", () => ({
  findCheckoutSessionByPaymentIntentId: vi.fn(),
  findCheckoutSessionBySubscriptionId: vi.fn(),
  findCheckoutSessionByStripeSessionId: vi.fn(),
  markStaleCheckoutSessions: vi.fn(),
  upsertCheckoutSession: vi.fn(),
  upsertOrder: vi.fn(),
  updateCheckoutSessionStatus: vi.fn(),
  updateOrderMetadata: vi.fn(),
}));

vi.mock("@/lib/ghl-client", () => {
  class MockGhlRequestError extends Error {
    status?: number;
    body?: string;
    constructor(message: string, status: number, body?: string) {
      super(message);
      this.name = "GhlRequestError";
      this.status = status;
      this.body = body;
    }
  }

  return {
    syncOrderWithGhl: vi.fn(),
    GhlRequestError: MockGhlRequestError,
    RETRYABLE_STATUS_CODES: new Set([408, 409, 425, 429, 500, 502, 503, 504]),
  };
});

vi.mock("@/lib/webhook-logs", () => ({
  recordWebhookLog: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/notifications/ops", () => ({
  sendOpsAlert: vi.fn(),
}));

vi.mock("@/lib/license-service", () => ({
  createLicenseForOrder: vi.fn(),
}));

import { POST } from "@/app/api/stripe/webhook/route";
import { getStripeClient } from "@/lib/payments/stripe";
import { getOfferConfig } from "@/lib/products/offer-config";
import {
  findCheckoutSessionByPaymentIntentId,
  findCheckoutSessionBySubscriptionId,
  findCheckoutSessionByStripeSessionId,
  markStaleCheckoutSessions,
  upsertCheckoutSession,
  upsertOrder,
  updateCheckoutSessionStatus,
  updateOrderMetadata,
} from "@/lib/checkout";
import { syncOrderWithGhl, GhlRequestError } from "@/lib/ghl-client";
import { recordWebhookLog } from "@/lib/webhook-logs";
import { sendOpsAlert } from "@/lib/notifications/ops";
import { createLicenseForOrder } from "@/lib/license-service";

const getStripeClientMock = vi.mocked(getStripeClient);
const getOfferConfigMock = vi.mocked(getOfferConfig);
const findCheckoutSessionByPaymentIntentIdMock = vi.mocked(findCheckoutSessionByPaymentIntentId);
const findCheckoutSessionBySubscriptionIdMock = vi.mocked(findCheckoutSessionBySubscriptionId);
const findCheckoutSessionByStripeSessionIdMock = vi.mocked(findCheckoutSessionByStripeSessionId);
const markStaleCheckoutSessionsMock = vi.mocked(markStaleCheckoutSessions);
const upsertCheckoutSessionMock = vi.mocked(upsertCheckoutSession);
const upsertOrderMock = vi.mocked(upsertOrder);
const updateCheckoutSessionStatusMock = vi.mocked(updateCheckoutSessionStatus);
const updateOrderMetadataMock = vi.mocked(updateOrderMetadata);
const syncOrderWithGhlMock = vi.mocked(syncOrderWithGhl);
const recordWebhookLogMock = vi.mocked(recordWebhookLog);
const sendOpsAlertMock = vi.mocked(sendOpsAlert);
const createLicenseForOrderMock = vi.mocked(createLicenseForOrder);
const fetchMock = vi.fn();

function buildFetchResponse(overrides?: Partial<{ ok: boolean; status: number; statusText: string; body: string }>) {
  return {
    ok: overrides?.ok ?? true,
    status: overrides?.status ?? 200,
    statusText: overrides?.statusText ?? "OK",
    text: vi.fn().mockResolvedValue(overrides?.body ?? ""),
  } as unknown as Response;
}

function resolveStripeClientMode(input: unknown): "test" | "live" | null {
  if (input === "test" || input === "live") {
    return input;
  }
  if (!input || typeof input !== "object") {
    return null;
  }
  const mode = (input as { mode?: unknown }).mode;
  return mode === "test" || mode === "live" ? mode : null;
}

function buildRequest(rawBody: string, signature = "test-signature") {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: {
      "stripe-signature": signature,
      "content-type": "application/json",
    },
    body: rawBody,
  });
}

const checkoutSessionFixture: CheckoutSessionRecord = {
  id: "checkout-session-id",
  stripeSessionId: "cs_test_123",
  stripePaymentIntentId: null,
  paymentProvider: "stripe",
  providerAccountAlias: "primary",
  providerSessionId: "cs_test_123",
  providerPaymentId: null,
  providerChargeId: null,
  providerMode: "test",
  offerId: "demo-offer",
  landerId: "demo-offer",
  customerEmail: "buyer@example.com",
  metadata: {
    product_page_url: "https://apps.example.com/demo-offer",
    purchase_url: "https://store.example.com/checkout/demo-offer",
    serply_link: "https://serp.ly/demo-offer",
    success_url: "https://apps.example.com/checkout/success?product=demo-offer",
    cancel_url: "https://apps.example.com/checkout?product=demo-offer",
    stripe_price_id: "price_123",
    stripe_product_id: "prod_demo",
    ghl_tag: "purchase-demo",
    environment: "test",
    offer_id: "demo-offer",
    lander_id: "demo-offer",
    product_name: "Demo Offer",
    product_slug: "demo-offer",
  },
  status: "pending",
  source: "stripe",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const offerConfigFixture: OfferConfig = {
  id: "demo-offer",
  stripePriceId: "price_123",
  successUrl: "https://example.com/success",
  cancelUrl: "https://example.com/cancel",
  mode: "payment",
  metadata: {
    product_page_url: "https://apps.example.com/demo-offer",
    purchase_url: "https://store.example.com/checkout/demo-offer",
    serply_link: "https://serp.ly/demo-offer",
    success_url: "https://apps.example.com/checkout/success?product=demo-offer",
    cancel_url: "https://apps.example.com/checkout?product=demo-offer",
  },
  productName: "Demo Offer",
  ghl: {
    pipelineId: "pipeline_123",
    stageId: "stage_abc",
    tagIds: ["purchase-demo"],
  },
};

function buildCheckoutSessionEvent() {
  const session = {
    id: "cs_test_123",
    object: "checkout.session",
    amount_total: 9900,
    currency: "usd",
    livemode: false,
    customer_email: "buyer@example.com",
    customer_details: {
      email: "buyer@example.com",
      name: "Buyer Example",
      phone: "+1234567890",
      address: null,
      tax_exempt: null,
      tax_ids: [],
    },
    payment_intent: "pi_test_123",
    metadata: {
      offer_id: "demo-offer",
      lander_id: "demo-offer",
      product_name: "Demo Offer",
      product_slug: "demo-offer",
      product_page_url: "https://apps.example.com/demo-offer",
      purchase_url: "https://store.example.com/checkout/demo-offer",
      serply_link: "https://serp.ly/demo-offer",
      success_url: "https://apps.example.com/checkout/success?product=demo-offer",
      cancel_url: "https://apps.example.com/checkout?product=demo-offer",
      stripe_price_id: "price_123",
      stripe_product_id: "prod_demo",
      ghl_tag: "purchase-demo",
      environment: "test",
    },
    client_reference_id: null,
    payment_status: "paid",
    status: "complete",
    mode: "payment",
    consent: {
      terms_of_service: "accepted",
      promotions: null,
    },
    consent_collection: {
      terms_of_service: "required",
      promotions: null,
      payment_method_reuse_agreement: null,
    },
  } satisfies Partial<Stripe.Checkout.Session>;

  return {
    id: "evt_test_123",
    object: "event",
    api_version: "2024-04-10",
    created: Math.floor(Date.now() / 1_000),
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null,
    },
    type: "checkout.session.completed",
    data: {
      object: session,
    },
  } as unknown as Stripe.Event;
}

function buildPaymentIntentEvent(
  type: "payment_intent.succeeded" | "payment_intent.payment_failed" | "payment_intent.canceled",
  overrides: Partial<Stripe.PaymentIntent> = {},
) {
  const isSucceeded = type === "payment_intent.succeeded";
  const isCanceled = type === "payment_intent.canceled";
  const baseIntent: Partial<Stripe.PaymentIntent> = {
    id: "pi_test_123",
    object: "payment_intent",
    amount: 9900,
    amount_received: isSucceeded ? 9900 : 0,
    currency: "usd",
    status: isSucceeded ? "succeeded" : isCanceled ? "canceled" : "requires_payment_method",
    payment_method_types: ["card"],
    metadata: {
      offer_id: "demo-offer",
      lander_id: "demo-offer",
      customer_email: "buyer@example.com",
      product_page_url: "https://apps.example.com/demo-offer",
      purchase_url: "https://store.example.com/checkout/demo-offer",
      serply_link: "https://serp.ly/demo-offer",
      success_url: "https://apps.example.com/checkout/success?product=demo-offer",
      cancel_url: "https://apps.example.com/checkout?product=demo-offer",
      stripe_price_id: "price_123",
      stripe_product_id: "prod_demo",
      ghl_tag: "purchase-demo",
      environment: "test",
    },
    latest_charge: "ch_test_123",
    receipt_email: "buyer@example.com",
  };

  const paymentIntent = { ...baseIntent, ...overrides } as Stripe.PaymentIntent;

  return {
    id: type === "payment_intent.succeeded" ? "evt_pi_succeeded" : "evt_pi_failed",
    object: "event",
    api_version: "2024-04-10",
    created: Math.floor(Date.now() / 1_000),
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null,
    },
    type,
    data: {
      object: paymentIntent,
    },
  } as unknown as Stripe.Event;
}

function buildSubscriptionDeletedEvent(overrides: Partial<Stripe.Subscription> = {}) {
  const subscription: Partial<Stripe.Subscription> = {
    id: "sub_test_123",
    object: "subscription",
    status: "canceled",
    cancel_at_period_end: false,
    current_period_end: Math.floor(Date.now() / 1_000),
    customer: "cus_test_123",
  };

  const merged = { ...subscription, ...overrides } as Stripe.Subscription;

  return {
    id: "evt_sub_deleted",
    object: "event",
    api_version: "2024-04-10",
    created: Math.floor(Date.now() / 1_000),
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null,
    },
    type: "customer.subscription.deleted",
    data: {
      object: merged,
    },
  } as unknown as Stripe.Event;
}

async function flushMicrotasks() {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(buildFetchResponse());
    markStaleCheckoutSessionsMock.mockResolvedValue(undefined);
    findCheckoutSessionByStripeSessionIdMock.mockResolvedValue(null);
    findCheckoutSessionByPaymentIntentIdMock.mockResolvedValue(null);
    findCheckoutSessionBySubscriptionIdMock.mockResolvedValue(null);
    upsertCheckoutSessionMock.mockResolvedValue("checkout-session-id");
    upsertOrderMock.mockResolvedValue(undefined);
    updateCheckoutSessionStatusMock.mockResolvedValue(undefined);
    updateOrderMetadataMock.mockResolvedValue(true);
    createLicenseForOrderMock.mockResolvedValue({
      action: "created",
      licenseId: "lic_test",
      licenseKey: "SERP-123",
      raw: {},
    });
  });

  it("processes checkout.session.completed events and syncs with GHL", async () => {
    const event = buildCheckoutSessionEvent();

    getStripeClientMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    } as unknown as ReturnType<typeof getStripeClient>);

    getOfferConfigMock.mockReturnValue(offerConfigFixture);
    findCheckoutSessionByStripeSessionIdMock.mockResolvedValue(checkoutSessionFixture);

    syncOrderWithGhlMock.mockResolvedValue({
      contactId: "contact_123",
      opportunityCreated: true,
    });

    recordWebhookLogMock.mockResolvedValueOnce(null);
    recordWebhookLogMock.mockResolvedValueOnce({
      status: "success",
      attempts: 1,
    });

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { received: boolean };
    expect(payload.received).toBe(true);

    expect(recordWebhookLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        paymentIntentId: "pi_test_123",
      }),
    );

    expect(upsertOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        offerId: "demo-offer",
        landerId: "demo-offer",
        amountTotal: 9900,
        customerEmail: "buyer@example.com",
        paymentStatus: "paid",
        stripePaymentIntentId: "pi_test_123",
        metadata: expect.objectContaining({
          payment_description: "Demo Offer",
          description: "Demo Offer",
          stripe_price_id: "price_123",
          stripe_product_id: "prod_demo",
          product_slug: "demo-offer",
          ghl_tag: "purchase-demo",
        }),
      }),
    );

    expect(syncOrderWithGhlMock).toHaveBeenCalledWith(
      offerConfigFixture.ghl,
      expect.objectContaining({
        offerId: "demo-offer",
        provider: "stripe",
        productPageUrl: "https://apps.example.com/demo-offer",
        purchaseUrl: "https://store.example.com/checkout/demo-offer",
        licenseEntitlements: ["demo-offer"],
        licenseTier: "demo-offer",
        metadata: expect.objectContaining({
          payment_description: "Demo Offer",
          description: "Demo Offer",
          stripe_price_id: "price_123",
          stripe_product_id: "prod_demo",
          stripeTermsOfService: "accepted",
          stripeTermsOfServiceRequirement: "required",
          product_slug: "demo-offer",
          ghl_tag: "purchase-demo",
          environment: "test",
          tosAccepted: "true",
          licenseKey: "SERP-123",
          licenseId: "lic_test",
        }),
        tosAccepted: true,
      }),
    );

    expect(createLicenseForOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          offer_id: "demo-offer",
          product_slug: "demo-offer",
          stripe_product_id: "prod_demo",
          ghl_tag: "purchase-demo",
        }),
      }),
    );

    expect(updateOrderMetadataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stripePaymentIntentId: "pi_test_123",
        stripeSessionId: "cs_test_123",
      }),
      expect.objectContaining({
        license: expect.objectContaining({
          licenseKey: "SERP-123",
          licenseId: "lic_test",
        }),
      }),
    );

    expect(updateCheckoutSessionStatusMock).toHaveBeenCalledWith(
      "cs_test_123",
      "completed",
      expect.objectContaining({
        metadata: expect.objectContaining({ ghlSyncedAt: expect.any(String) }),
      }),
    );

    expect(recordWebhookLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        paymentIntentId: "pi_test_123",
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://auth.serp.co/internal/entitlements/grant",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-serp-internal-secret": "serp_auth_test_secret",
        }),
      }),
    );

    const fetchOptions = fetchMock.mock.calls[0]?.[1] as { body?: string } | undefined;
    expect(fetchOptions?.body).toBeTruthy();
    const parsed = JSON.parse(fetchOptions!.body as string) as {
      email: string;
      entitlements: string[];
      metadata?: Record<string, unknown>;
    };

    expect(parsed.email).toBe("buyer@example.com");
    expect(parsed.entitlements).toEqual(["demo-offer"]);
    expect(parsed.metadata).toEqual(
      expect.objectContaining({
        source: "stripe",
        env: "test",
        offerId: "demo-offer",
        paymentStatus: "paid",
        stripe: expect.objectContaining({
          eventId: "evt_test_123",
          eventType: "checkout.session.completed",
          livemode: false,
          created: expect.any(Number),
          checkoutSessionId: "cs_test_123",
          paymentIntentId: "pi_test_123",
        }),
        lineItems: expect.any(Array),
      }),
    );

    await flushMicrotasks();
    expect(markStaleCheckoutSessionsMock).toHaveBeenCalled();
  });

  it("does not grant SERP auth entitlements for unpaid sessions", async () => {
    const event = buildCheckoutSessionEvent();
    const session = event.data.object as Stripe.Checkout.Session;
    session.payment_status = "unpaid";

    getStripeClientMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    } as unknown as ReturnType<typeof getStripeClient>);

    getOfferConfigMock.mockReturnValue(offerConfigFixture);
    findCheckoutSessionByStripeSessionIdMock.mockResolvedValue(checkoutSessionFixture);

    syncOrderWithGhlMock.mockResolvedValue({
      contactId: "contact_123",
      opportunityCreated: true,
    });

    recordWebhookLogMock.mockResolvedValueOnce(null);
    recordWebhookLogMock.mockResolvedValueOnce({
      status: "success",
      attempts: 1,
    });

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("aggregates all GHL tags from checkout line items", async () => {
    const event = buildCheckoutSessionEvent();
    const session = event.data.object as Stripe.Checkout.Session;
    session.metadata = {
      offer_id: "demo-offer",
      lander_id: "demo-offer",
      product_name: "Demo Offer",
      product_slug: "demo-offer",
      stripe_price_id: "price_primary",
      stripe_product_id: "prod_primary",
      ghl_tag: "purchase-demo",
      environment: "test",
    };

    const listLineItemsMock = vi.fn().mockResolvedValue({
      data: [
        {
          price: {
            id: "price_primary",
            metadata: {
              ghl_tag: "purchase-demo",
              product_slug: "demo-offer",
            },
            product: {
              id: "prod_primary",
              metadata: {
                ghl_tag: "purchase-demo",
                product_slug: "demo-offer",
              },
            },
          },
        },
        {
          price: {
            id: "price_bundle",
            metadata: {
              ghl_tag: "purchase-cross-sell",
              product_slug: "bundle-offer",
            },
            product: {
              id: "prod_bundle",
              metadata: {
                ghl_tag: "purchase-cross-sell",
                product_slug: "bundle-offer",
              },
            },
          },
        },
      ],
    });

    const webhookClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      paymentIntents: {
        update: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as ReturnType<typeof getStripeClient>;

    getStripeClientMock.mockImplementation((options?: unknown) => {
      if (resolveStripeClientMode(options)) {
        return {
          checkout: {
            sessions: {
              listLineItems: listLineItemsMock,
            },
          },
          paymentLinks: {
            retrieve: vi.fn(),
          },
        } as unknown as ReturnType<typeof getStripeClient>;
      }

      return webhookClient;
    });

    getOfferConfigMock.mockReturnValue(offerConfigFixture);
    findCheckoutSessionByStripeSessionIdMock.mockResolvedValue(checkoutSessionFixture);

    syncOrderWithGhlMock.mockResolvedValue({
      contactId: "contact_multi",
      opportunityCreated: true,
    });

    recordWebhookLogMock.mockResolvedValueOnce(null);
    recordWebhookLogMock.mockResolvedValueOnce({
      status: "success",
      attempts: 1,
    });

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    expect(listLineItemsMock).toHaveBeenCalledWith(
      "cs_test_123",
      expect.objectContaining({
        expand: ["data.price.product"],
        limit: 100,
      }),
    );

    expect(syncOrderWithGhlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tagIds: ["purchase-demo", "purchase-cross-sell"],
      }),
      expect.objectContaining({
        metadata: expect.objectContaining({
          ghl_tag: "purchase-demo",
        }),
      }),
    );
  });

  it("grants entitlements for optional bundle line items", async () => {
    const event = buildCheckoutSessionEvent();
    const session = event.data.object as Stripe.Checkout.Session;
    session.metadata = {
      offer_id: "loom-video-downloader",
      lander_id: "loom-video-downloader",
      product_name: "Loom Video Downloader",
      product_slug: "loom-video-downloader",
      stripe_price_id: "price_primary",
      stripe_product_id: "prod_primary",
      ghl_tag: "purchase-loom-video-downloader",
      environment: "test",
    };

    const listLineItemsMock = vi.fn().mockResolvedValue({
      data: [
        {
          quantity: 1,
          price: {
            id: "price_primary",
            metadata: {
              product_slug: "loom-video-downloader",
            },
            product: {
              id: "prod_primary",
              metadata: {
                product_slug: "loom-video-downloader",
              },
            },
          },
        },
        {
          quantity: 1,
          price: {
            id: "price_bundle",
            metadata: {
              product_slug: "serp-downloaders-bundle",
            },
            product: {
              id: "prod_bundle",
              metadata: {
                product_slug: "serp-downloaders-bundle",
              },
            },
          },
        },
      ],
    });

    const webhookClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      paymentIntents: {
        update: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as ReturnType<typeof getStripeClient>;

    getStripeClientMock.mockImplementation((options?: unknown) => {
      if (resolveStripeClientMode(options)) {
        return {
          checkout: {
            sessions: {
              listLineItems: listLineItemsMock,
            },
          },
          paymentLinks: {
            retrieve: vi.fn(),
          },
        } as unknown as ReturnType<typeof getStripeClient>;
      }

      return webhookClient;
    });

    const offerConfig: OfferConfig = {
      id: "loom-video-downloader",
      stripePriceId: "price_primary",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      mode: "payment",
      metadata: {
        product_page_url: "https://apps.serp.co/loom-video-downloader",
        purchase_url: "https://serp.ly/loom-video-downloader",
        serply_link: "https://serp.ly/loom-video-downloader",
        success_url: "https://apps.serp.co/checkout/success?product=loom-video-downloader",
        cancel_url: "https://apps.serp.co/checkout?product=loom-video-downloader",
      },
      productName: "Loom Video Downloader",
      ghl: {
        pipelineId: "pipeline_loom",
        stageId: "stage_loom",
        tagIds: ["purchase-loom-video-downloader"],
      },
    };

    getOfferConfigMock.mockReturnValue(offerConfig);
    findCheckoutSessionByStripeSessionIdMock.mockResolvedValue(checkoutSessionFixture);

    syncOrderWithGhlMock.mockResolvedValue({
      contactId: "contact_bundle",
      opportunityCreated: true,
    });

    recordWebhookLogMock.mockResolvedValueOnce(null);
    recordWebhookLogMock.mockResolvedValueOnce({
      status: "success",
      attempts: 1,
    });

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    const fetchOptions = fetchMock.mock.calls[0]?.[1] as { body?: string } | undefined;
    expect(fetchOptions?.body).toBeTruthy();
    const parsed = JSON.parse(fetchOptions!.body as string) as { entitlements: string[] };

    expect(parsed.entitlements).toEqual(
      expect.arrayContaining(["loom-downloader", "serp-downloaders-bundle"]),
    );

    expect(upsertOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          license_entitlements_resolved: expect.stringContaining("loom-downloader"),
          license_entitlements_resolved_count: expect.any(String),
        }),
      }),
    );

    const firstCall = upsertOrderMock.mock.calls[0]?.[0] as { metadata?: Record<string, unknown> } | undefined;
    const resolvedCountRaw = firstCall?.metadata?.license_entitlements_resolved_count;
    const resolvedCount = typeof resolvedCountRaw === "string" ? Number.parseInt(resolvedCountRaw, 10) : 0;
    expect(resolvedCount).toBeGreaterThan(1);
  });

  it("falls back to Stripe product ID mapping when optional item metadata is missing", async () => {
    const event = buildCheckoutSessionEvent();
    const session = event.data.object as Stripe.Checkout.Session;
    session.metadata = {
      offer_id: "loom-video-downloader",
      lander_id: "loom-video-downloader",
      product_name: "Loom Video Downloader",
      product_slug: "loom-video-downloader",
      stripe_price_id: "price_primary",
      stripe_product_id: "prod_primary",
      ghl_tag: "purchase-loom-video-downloader",
      environment: "test",
    };

    const listLineItemsMock = vi.fn().mockResolvedValue({
      data: [
        {
          quantity: 1,
          price: {
            id: "price_primary",
            metadata: {
              product_slug: "loom-video-downloader",
            },
            product: {
              id: "prod_primary",
              metadata: {
                product_slug: "loom-video-downloader",
              },
            },
          },
        },
        {
          quantity: 1,
          price: {
            id: "price_bundle",
            metadata: {},
            product: {
              id: "prod_TadNFo3sxzkGYb",
              metadata: {},
            },
          },
        },
      ],
    });

    const webhookClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      paymentIntents: {
        update: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as ReturnType<typeof getStripeClient>;

    getStripeClientMock.mockImplementation((options?: unknown) => {
      if (resolveStripeClientMode(options)) {
        return {
          checkout: {
            sessions: {
              listLineItems: listLineItemsMock,
            },
          },
          paymentLinks: {
            retrieve: vi.fn(),
          },
        } as unknown as ReturnType<typeof getStripeClient>;
      }

      return webhookClient;
    });

    const offerConfig: OfferConfig = {
      id: "loom-video-downloader",
      stripePriceId: "price_primary",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      mode: "payment",
      metadata: {
        product_page_url: "https://apps.serp.co/loom-video-downloader",
        purchase_url: "https://serp.ly/loom-video-downloader",
        serply_link: "https://serp.ly/loom-video-downloader",
        success_url: "https://apps.serp.co/checkout/success?product=loom-video-downloader",
        cancel_url: "https://apps.serp.co/checkout?product=loom-video-downloader",
      },
      productName: "Loom Video Downloader",
      ghl: {
        pipelineId: "pipeline_loom",
        stageId: "stage_loom",
        tagIds: ["purchase-loom-video-downloader"],
      },
    };

    getOfferConfigMock.mockReturnValue(offerConfig);
    findCheckoutSessionByStripeSessionIdMock.mockResolvedValue(checkoutSessionFixture);

    syncOrderWithGhlMock.mockResolvedValue({
      contactId: "contact_bundle",
      opportunityCreated: true,
    });

    recordWebhookLogMock.mockResolvedValueOnce(null);
    recordWebhookLogMock.mockResolvedValueOnce({
      status: "success",
      attempts: 1,
    });

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    const fetchOptions = fetchMock.mock.calls[0]?.[1] as { body?: string } | undefined;
    expect(fetchOptions?.body).toBeTruthy();
    const parsed = JSON.parse(fetchOptions!.body as string) as { entitlements: string[] };

    expect(parsed.entitlements).toEqual(
      expect.arrayContaining(["loom-downloader", "serp-downloaders-bundle"]),
    );
  });

  it("prefers optional item tags when the primary item quantity is zero", async () => {
    const event = buildCheckoutSessionEvent();
    const session = event.data.object as Stripe.Checkout.Session;
    session.metadata = {
      offer_id: "demo-offer",
      lander_id: "demo-offer",
      product_slug: "demo-offer",
      stripe_price_id: "price_primary",
      stripe_product_id: "prod_primary",
      ghl_tag: "purchase-demo",
      environment: "test",
    };

    const listLineItemsMock = vi.fn().mockResolvedValue({
      data: [
        {
          quantity: 0,
          price: {
            id: "price_primary",
            metadata: {
              ghl_tag: "purchase-demo",
              product_slug: "demo-offer",
            },
            product: {
              id: "prod_primary",
              metadata: {
                ghl_tag: "purchase-demo",
                product_slug: "demo-offer",
              },
            },
          },
        },
        {
          quantity: 1,
          price: {
            id: "price_bundle",
            metadata: {
              ghl_tag: "purchase-cross-sell",
              product_slug: "bundle-offer",
            },
            product: {
              id: "prod_bundle",
              metadata: {
                ghl_tag: "purchase-cross-sell",
                product_slug: "bundle-offer",
              },
            },
          },
        },
      ],
    });

    const webhookClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      paymentIntents: {
        update: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as ReturnType<typeof getStripeClient>;

    getStripeClientMock.mockImplementation((options?: unknown) => {
      if (resolveStripeClientMode(options)) {
        return {
          checkout: {
            sessions: {
              listLineItems: listLineItemsMock,
            },
          },
          paymentLinks: {
            retrieve: vi.fn(),
          },
        } as unknown as ReturnType<typeof getStripeClient>;
      }

      return webhookClient;
    });

    getOfferConfigMock.mockReturnValue(offerConfigFixture);
    findCheckoutSessionByStripeSessionIdMock.mockResolvedValue(checkoutSessionFixture);

    syncOrderWithGhlMock.mockResolvedValue({
      contactId: "contact_multi",
      opportunityCreated: true,
    });

    recordWebhookLogMock.mockResolvedValueOnce(null);
    recordWebhookLogMock.mockResolvedValueOnce({
      status: "success",
      attempts: 1,
    });

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    expect(listLineItemsMock).toHaveBeenCalledWith(
      "cs_test_123",
      expect.objectContaining({
        expand: ["data.price.product"],
        limit: 100,
      }),
    );

    expect(syncOrderWithGhlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tagIds: ["purchase-cross-sell", "purchase-demo"],
      }),
      expect.objectContaining({
        metadata: expect.objectContaining({
          ghl_tag: "purchase-cross-sell",
        }),
      }),
    );
  });

  it("ignores metadata fallback when line items provide tags", async () => {
    const event = buildCheckoutSessionEvent();
    const session = event.data.object as Stripe.Checkout.Session;
    session.metadata = {
      offer_id: "demo-offer",
      lander_id: "demo-offer",
      product_slug: "demo-offer",
      stripe_price_id: "price_primary",
      stripe_product_id: "prod_primary",
      ghl_tag: "purchase-demo",
      environment: "test",
    };

    const listLineItemsMock = vi.fn().mockResolvedValue({
      data: [
        {
          quantity: 1,
          price: {
            id: "price_bundle",
            metadata: {
              ghl_tag: "purchase-cross-sell",
              product_slug: "bundle-offer",
            },
            product: {
              id: "prod_bundle",
              metadata: {
                ghl_tag: "purchase-cross-sell",
                product_slug: "bundle-offer",
              },
            },
          },
        },
      ],
    });

    const webhookClient = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      paymentIntents: {
        update: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as ReturnType<typeof getStripeClient>;

    getStripeClientMock.mockImplementation((options?: unknown) => {
      if (resolveStripeClientMode(options)) {
        return {
          checkout: {
            sessions: {
              listLineItems: listLineItemsMock,
            },
          },
          paymentLinks: {
            retrieve: vi.fn(),
          },
        } as unknown as ReturnType<typeof getStripeClient>;
      }

      return webhookClient;
    });

    getOfferConfigMock.mockReturnValue(offerConfigFixture);
    findCheckoutSessionByStripeSessionIdMock.mockResolvedValue(checkoutSessionFixture);

    syncOrderWithGhlMock.mockResolvedValue({
      contactId: "contact_multi",
      opportunityCreated: true,
    });

    recordWebhookLogMock.mockResolvedValueOnce(null);
    recordWebhookLogMock.mockResolvedValueOnce({
      status: "success",
      attempts: 1,
    });

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    expect(syncOrderWithGhlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tagIds: ["purchase-cross-sell"],
      }),
      expect.objectContaining({
        metadata: expect.objectContaining({
          ghl_tag: "purchase-cross-sell",
        }),
      }),
    );

    expect(recordWebhookLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "checkout.session.completed",
        metadata: expect.objectContaining({
          // handler logs resolved tag counts for observability
          resolvedTagCount: 1,
          resolvedTags: ["purchase-cross-sell"],
        }),
      }),
    );
  });

  it("sends an ops alert when GHL sync repeatedly fails", async () => {
    const event = buildCheckoutSessionEvent();

    getStripeClientMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    } as unknown as ReturnType<typeof getStripeClient>);

    getOfferConfigMock.mockReturnValue(offerConfigFixture);
    findCheckoutSessionByStripeSessionIdMock.mockResolvedValue(checkoutSessionFixture);

    const error = new GhlRequestError("GHL unavailable", 500, "internal");
    syncOrderWithGhlMock.mockRejectedValue(error);

    recordWebhookLogMock.mockResolvedValueOnce(null);
    recordWebhookLogMock.mockResolvedValueOnce({
      status: "error",
      attempts: 3,
    });

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    expect(updateCheckoutSessionStatusMock).toHaveBeenCalledWith(
      "cs_test_123",
      "completed",
      expect.objectContaining({
        metadata: expect.objectContaining({ ghlSyncError: expect.stringContaining("GHL unavailable") }),
      }),
    );

    expect(sendOpsAlertMock).toHaveBeenCalledWith(
      "GHL sync failed after multiple attempts",
      expect.objectContaining({
        offerId: "demo-offer",
        paymentIntentId: "pi_test_123",
      }),
    );
  });

  it("updates orders when payment_intent.succeeded fires", async () => {
    const event = buildPaymentIntentEvent("payment_intent.succeeded");

    getStripeClientMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    } as unknown as ReturnType<typeof getStripeClient>);

    findCheckoutSessionByPaymentIntentIdMock.mockResolvedValue(checkoutSessionFixture);

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    expect(updateCheckoutSessionStatusMock).toHaveBeenCalledWith(
      checkoutSessionFixture.stripeSessionId,
      "completed",
      expect.objectContaining({
        paymentIntentId: "pi_test_123",
        metadata: expect.objectContaining({ offer_id: "demo-offer" }),
      }),
    );

    expect(upsertOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        checkoutSessionId: checkoutSessionFixture.id,
        stripePaymentIntentId: "pi_test_123",
        amountTotal: 9900,
        paymentStatus: "succeeded",
      }),
    );
  });

  it("marks checkout failed when payment_intent.payment_failed fires", async () => {
    const event = buildPaymentIntentEvent("payment_intent.payment_failed", {
      last_payment_error: {
        message: "card declined",
        type: "card_error",
      },
    });

    getStripeClientMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    } as unknown as ReturnType<typeof getStripeClient>);

    findCheckoutSessionByPaymentIntentIdMock.mockResolvedValue(checkoutSessionFixture);

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    expect(updateCheckoutSessionStatusMock).toHaveBeenCalledWith(
      checkoutSessionFixture.stripeSessionId,
      "failed",
      expect.objectContaining({
        paymentIntentId: "pi_test_123",
        metadata: expect.objectContaining({ lastPaymentError: "card declined" }),
      }),
    );

    expect(upsertOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stripePaymentIntentId: "pi_test_123",
        paymentStatus: "requires_payment_method",
      }),
    );
  });

  it("marks checkout failed when payment_intent.canceled fires", async () => {
    const event = buildPaymentIntentEvent("payment_intent.canceled");

    getStripeClientMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    } as unknown as ReturnType<typeof getStripeClient>);

    findCheckoutSessionByPaymentIntentIdMock.mockResolvedValue(checkoutSessionFixture);

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    expect(updateCheckoutSessionStatusMock).toHaveBeenCalledWith(
      checkoutSessionFixture.stripeSessionId,
      "failed",
      expect.objectContaining({
        paymentIntentId: "pi_test_123",
      }),
    );

    expect(upsertOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stripePaymentIntentId: "pi_test_123",
        paymentStatus: "canceled",
      }),
    );
  });

  it("keeps entitlements when subscription has remaining time", async () => {
    const nowSeconds = Math.floor(Date.now() / 1_000);
    const event = buildSubscriptionDeletedEvent({
      cancel_at_period_end: true,
      current_period_end: nowSeconds + 60 * 60 * 24 * 7,
    });

    getStripeClientMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    } as unknown as ReturnType<typeof getStripeClient>);

    findCheckoutSessionBySubscriptionIdMock.mockResolvedValue(checkoutSessionFixture);

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("revokes entitlements when subscription ends", async () => {
    const nowSeconds = Math.floor(Date.now() / 1_000);
    const event = buildSubscriptionDeletedEvent({
      cancel_at_period_end: true,
      current_period_end: nowSeconds - 60,
    });

    getStripeClientMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    } as unknown as ReturnType<typeof getStripeClient>);

    findCheckoutSessionBySubscriptionIdMock.mockResolvedValue(checkoutSessionFixture);

    const response = await POST(buildRequest("{}"));
    expect(response.status).toBe(200);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://auth.serp.co/internal/entitlements/revoke",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-serp-internal-secret": "serp_auth_test_secret",
        }),
      }),
    );
  });
});
