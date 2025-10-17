"use client";

import { captureEvent, captureFrontendError } from "./posthog";
import {
  pushAddPaymentInfoEvent,
  pushBeginCheckoutEvent,
  type EcommerceItem,
} from "./gtm";

type CheckoutContext = {
  productSlug?: string | null;
  productName?: string | null;
  affiliateId?: string | null;
  ecommerceItem?: EcommerceItem;
  currency?: string | null;
  value?: number | null;
  couponCode?: string | null;
  isInitialSelection?: boolean;
  release?: string | null;
};

const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_GA_CURRENCY ?? "USD";

function resolveItems(item?: EcommerceItem): EcommerceItem[] | undefined {
  if (!item) {
    return undefined;
  }
  return [item];
}

export function trackCheckoutPageViewed(context: CheckoutContext) {
  captureEvent("checkout_viewed", {
    ...context,
  });

  const items = resolveItems(context.ecommerceItem);
  if (items) {
    pushBeginCheckoutEvent({
      items,
      currency: context.currency ?? DEFAULT_CURRENCY,
      value: context.value ?? undefined,
      coupon: context.couponCode ?? undefined,
    });
  }
}

export function trackCheckoutPaymentMethodSelected(
  method: "stripe" | "paypal",
  context: CheckoutContext,
) {
  captureEvent("checkout_payment_method_selected", {
    method,
    ...context,
  });

  const items = resolveItems(context.ecommerceItem);
  if (items) {
    pushAddPaymentInfoEvent({
      items,
      paymentType: method,
      currency: context.currency ?? DEFAULT_CURRENCY,
      value: context.value ?? undefined,
    });
  }
}

export function trackCheckoutSessionReady(context: CheckoutContext & { provider: "stripe" | "paypal" }) {
  captureEvent("checkout_session_ready", {
    ...context,
  });

  if (context.isInitialSelection) {
    const items = resolveItems(context.ecommerceItem);
    if (items) {
      pushAddPaymentInfoEvent({
        items,
        paymentType: context.provider,
        currency: context.currency ?? DEFAULT_CURRENCY,
        value: context.value ?? undefined,
      });
    }
  }
}

export function trackCheckoutError(error: unknown, context: CheckoutContext & { step: string }) {
  captureFrontendError(error, {
    ...context,
    step: context.step,
    area: "checkout",
  });
}

export function trackCheckoutOrderBumpToggled(
  selected: boolean,
  context: CheckoutContext & { orderBumpId: string; orderBumpPrice?: number | null },
) {
  captureEvent("checkout_order_bump_toggled", {
    selected,
    ...context,
  });
}
