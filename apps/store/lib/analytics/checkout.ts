"use client";

import { captureEvent, captureFrontendError } from "./posthog";

type CheckoutContext = {
  productSlug?: string | null;
  productName?: string | null;
  affiliateId?: string | null;
};

export function trackCheckoutPageViewed(context: CheckoutContext) {
  captureEvent("checkout_viewed", {
    ...context,
  });
}

export function trackCheckoutPaymentMethodSelected(
  method: "stripe" | "paypal",
  context: CheckoutContext,
) {
  captureEvent("checkout_payment_method_selected", {
    method,
    ...context,
  });
}

export function trackCheckoutSessionReady(context: CheckoutContext & { provider: "stripe" | "paypal" }) {
  captureEvent("checkout_session_ready", {
    ...context,
  });
}

export function trackCheckoutError(error: unknown, context: CheckoutContext & { step: string }) {
  captureFrontendError(error, {
    ...context,
    step: context.step,
    area: "checkout",
  });
}
