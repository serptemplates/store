import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("@/lib/checkout", () => ({
  findCheckoutSessionBySubscriptionId: vi.fn(),
}));

vi.mock("@/lib/payments/stripe", () => ({
  getStripeClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { getStripeClient } from "@/lib/payments/stripe";
import { findCheckoutSessionBySubscriptionId } from "@/lib/checkout";
import { handleInvoicePaymentSucceeded } from "@/lib/payments/stripe-webhook/events/invoice-payment-succeeded";

const getStripeClientMock = vi.mocked(getStripeClient);
const findCheckoutSessionBySubscriptionIdMock = vi.mocked(findCheckoutSessionBySubscriptionId);

describe("handleInvoicePaymentSucceeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findCheckoutSessionBySubscriptionIdMock.mockResolvedValue(null);
  });

  it("uses invoice metadata for subscription description when session is missing", async () => {
    const paymentIntentsUpdate = vi.fn().mockResolvedValue({});
    const productsRetrieve = vi.fn().mockResolvedValue({ id: "prod_test", name: "Ignored", object: "product" });

    getStripeClientMock.mockReturnValue({
      paymentIntents: { update: paymentIntentsUpdate },
      products: { retrieve: productsRetrieve },
    } as unknown as Stripe);

    const invoice = {
      id: "in_test_meta",
      subscription: "sub_test",
      payment_intent: "pi_test",
      livemode: false,
      customer_email: "buyer@example.com",
      metadata: { product_name: "Demo Subscription" },
      lines: { data: [] },
    } as unknown as Stripe.Invoice;

    await handleInvoicePaymentSucceeded(invoice);

    expect(paymentIntentsUpdate).toHaveBeenCalledWith("pi_test", {
      description: "Subscription - Demo Subscription",
    });
    expect(productsRetrieve).not.toHaveBeenCalled();
  });

  it("falls back to line-item price product name when metadata is missing", async () => {
    const paymentIntentsUpdate = vi.fn().mockResolvedValue({});
    const productsRetrieve = vi.fn().mockResolvedValue({
      id: "prod_test",
      name: "Line Item Product",
      object: "product",
    });

    getStripeClientMock.mockReturnValue({
      paymentIntents: { update: paymentIntentsUpdate },
      products: { retrieve: productsRetrieve },
    } as unknown as Stripe);

    const price = { id: "price_test", product: "prod_test", nickname: null } as unknown as Stripe.Price;
    const lineItem = {
      id: "il_test",
      object: "line_item",
      proration: false,
      type: "subscription",
      price,
      description: null,
    } as unknown as Stripe.InvoiceLineItem;

    const invoice = {
      id: "in_test_line",
      subscription: "sub_test_line",
      payment_intent: "pi_test_line",
      livemode: true,
      customer_email: "buyer@example.com",
      metadata: {},
      lines: { data: [lineItem] },
    } as unknown as Stripe.Invoice;

    await handleInvoicePaymentSucceeded(invoice);

    expect(productsRetrieve).toHaveBeenCalledWith("prod_test");
    expect(paymentIntentsUpdate).toHaveBeenCalledWith("pi_test_line", {
      description: "Subscription - Line Item Product",
    });
  });
});
