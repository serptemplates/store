import { describe, expect, it, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

vi.mock("@/lib/payments/stripe", () => ({
  getStripeClient: vi.fn(),
}));

vi.mock("@/lib/checkout", () => ({
  findCheckoutSessionByStripeSessionId: vi.fn().mockResolvedValue(null),
  upsertCheckoutSession: vi.fn().mockResolvedValue("checkout-session-id"),
  upsertOrder: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/account/service", () => ({
  ensureAccountForPurchase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/products/offer-config", () => ({
  getOfferConfig: vi.fn().mockReturnValue({ productName: "Rawpixel Downloader" }),
}));

import { getStripeClient } from "@/lib/payments/stripe";
import { upsertOrder, upsertCheckoutSession } from "@/lib/checkout";
import { processCheckoutSession } from "@/app/checkout/success/actions";

const getStripeClientMock = vi.mocked(getStripeClient);
const upsertOrderMock = vi.mocked(upsertOrder);
const upsertCheckoutSessionMock = vi.mocked(upsertCheckoutSession);

describe("checkout success action populates payment description", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets paymentDescription, payment_description, and description from product name", async () => {
    const sessionId = "cs_test_123";

    // Build a fake checkout session with line item + product
    const fakeProduct = { id: "prod_test", name: "Rawpixel Downloader", object: "product" } as unknown as Stripe.Product;
    const fakePrice = { id: "price_test", product: fakeProduct } as unknown as Stripe.Price;
    const fakeLineItem = { price: fakePrice, description: "Rawpixel Downloader" } as unknown as Stripe.LineItem;

    const fakeSession = {
      id: sessionId,
      object: "checkout.session",
      status: "complete",
      payment_status: "paid",
      mode: "payment",
      amount_total: 1700,
      currency: "usd",
      client_reference_id: null,
      customer_email: "buyer@example.com",
      customer_details: { email: "buyer@example.com", name: "Buyer" },
      livemode: false,
      payment_intent: { id: "pi_test_123" },
      line_items: { object: "list", data: [fakeLineItem] },
      metadata: { productSlug: "rawpixel-downloader" },
    } as unknown as Stripe.Checkout.Session;

    getStripeClientMock.mockReturnValue({
      checkout: { sessions: { retrieve: vi.fn().mockResolvedValue(fakeSession) } },
    } as unknown as Stripe);

    const result = await processCheckoutSession(sessionId);
    expect(result.success).toBe(true);

    // upsertCheckoutSession receives augmentedMetadata with the fields
    expect(upsertCheckoutSessionMock).toHaveBeenCalled();
    const checkoutArgs = upsertCheckoutSessionMock.mock.calls[0]?.[0];
    expect(checkoutArgs?.metadata?.paymentDescription).toBe("Rawpixel Downloader");
    expect(checkoutArgs?.metadata?.payment_description).toBe("Rawpixel Downloader");
    expect(checkoutArgs?.metadata?.description).toBe("Rawpixel Downloader");

    // upsertOrder receives augmentedMetadata with the fields
    expect(upsertOrderMock).toHaveBeenCalled();
    const orderArgs = upsertOrderMock.mock.calls[0]?.[0];
    expect(orderArgs?.metadata?.paymentDescription).toBe("Rawpixel Downloader");
    expect(orderArgs?.metadata?.payment_description).toBe("Rawpixel Downloader");
    expect(orderArgs?.metadata?.description).toBe("Rawpixel Downloader");
  });
});
