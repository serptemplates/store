import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics/posthog", () => ({
  captureEvent: vi.fn(),
  captureFrontendError: vi.fn(),
}));

vi.mock("@/lib/analytics/gtm", () => ({
  pushAddPaymentInfoEvent: vi.fn(),
  pushBeginCheckoutEvent: vi.fn(),
}));

const { captureEvent } = await import("@/lib/analytics/posthog");
const { pushAddPaymentInfoEvent, pushBeginCheckoutEvent } = await import("@/lib/analytics/gtm");

import {
  trackCheckoutOrderBumpToggled,
  trackCheckoutPageViewed,
  trackCheckoutSessionReady,
} from "@/lib/analytics/checkout";

describe("analytics/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits a single event when an order bump is toggled", () => {
    trackCheckoutOrderBumpToggled(true, {
      productSlug: "example",
      productName: "Example Product",
      affiliateId: "aff-123",
      currency: "USD",
      value: 94,
      ecommerceItem: {
        item_id: "example",
        item_name: "Example Product",
        price: 94,
        quantity: 1,
      },
      orderBumpId: "bundle",
      orderBumpPrice: 47,
    });

    expect(captureEvent).toHaveBeenCalledTimes(1);
    expect(captureEvent).toHaveBeenCalledWith("checkout_order_bump_toggled", expect.objectContaining({
      selected: true,
      orderBumpId: "bundle",
      orderBumpPrice: 47,
    }));
    expect(pushAddPaymentInfoEvent).not.toHaveBeenCalled();
  });

  it("only forwards add_payment_info once when the initial checkout session resolves", () => {
    trackCheckoutSessionReady({
      provider: "stripe",
      productSlug: "example",
      productName: "Example Product",
      currency: "USD",
      value: 67,
      ecommerceItem: {
        item_id: "example",
        item_name: "Example Product",
        price: 67,
        quantity: 1,
      },
      affiliateId: null,
      isInitialSelection: true,
    });

    expect(pushAddPaymentInfoEvent).toHaveBeenCalledTimes(1);

    trackCheckoutSessionReady({
      provider: "stripe",
      productSlug: "example",
      productName: "Example Product",
      currency: "USD",
      value: 67,
      ecommerceItem: {
        item_id: "example",
        item_name: "Example Product",
        price: 67,
        quantity: 1,
      },
      affiliateId: null,
      isInitialSelection: false,
    });

    expect(pushAddPaymentInfoEvent).toHaveBeenCalledTimes(1);
  });

  it("skips GTM events when ecommerce metadata is unavailable", () => {
    trackCheckoutPageViewed({
      productSlug: "example",
      productName: "Example Product",
      affiliateId: null,
    });

    expect(pushBeginCheckoutEvent).not.toHaveBeenCalled();
    expect(captureEvent).toHaveBeenCalledWith("checkout_viewed", expect.any(Object));
  });
});
