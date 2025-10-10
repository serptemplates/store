"use client";

type Primitive = string | number | boolean | null | undefined;

export type EcommerceItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_category2?: string;
  price?: number;
  quantity?: number;
};

function getSafeWindow(): Window & { dataLayer?: Array<Record<string, unknown>> } | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window as Window & { dataLayer?: Array<Record<string, unknown>> };
}

function pushToDataLayer(payload: Record<string, Primitive | Record<string, unknown> | Array<unknown>>): void {
  const runtime = getSafeWindow();
  if (!runtime) {
    return;
  }

  runtime.dataLayer = runtime.dataLayer || [];
  runtime.dataLayer.push(payload);
}

function pushEcommerceEvent(event: string, ecommerce: Record<string, unknown>): void {
  pushToDataLayer({ event: "clear_ecommerce", ecommerce: null });
  pushToDataLayer({ event, ecommerce });
}

export function pushViewItemEvent(params: {
  items: EcommerceItem[];
  currency?: string | null;
  value?: number | null;
}) {
  pushEcommerceEvent("view_item", {
    currency: params.currency ?? undefined,
    value: params.value ?? undefined,
    items: params.items,
  });
}

export function pushSelectItemEvent(params: {
  items: EcommerceItem[];
  currency?: string | null;
  value?: number | null;
}) {
  pushEcommerceEvent("select_item", {
    currency: params.currency ?? undefined,
    value: params.value ?? undefined,
    items: params.items,
  });
}

export function pushBeginCheckoutEvent(params: {
  items: EcommerceItem[];
  currency?: string | null;
  value?: number | null;
  coupon?: string | null;
}) {
  pushEcommerceEvent("begin_checkout", {
    currency: params.currency ?? undefined,
    value: params.value ?? undefined,
    coupon: params.coupon ?? undefined,
    items: params.items,
  });
}

export function pushAddPaymentInfoEvent(params: {
  items: EcommerceItem[];
  paymentType: string;
  currency?: string | null;
  value?: number | null;
}) {
  pushEcommerceEvent("add_payment_info", {
    currency: params.currency ?? undefined,
    value: params.value ?? undefined,
    payment_type: params.paymentType,
    items: params.items,
  });
}

export function pushPurchaseEvent(params: {
  transactionId: string;
  items: EcommerceItem[];
  value?: number | null;
  currency?: string | null;
  tax?: number | null;
  shipping?: number | null;
  coupon?: string | null;
  affiliation?: string | null;
}) {
  pushEcommerceEvent("purchase", {
    transaction_id: params.transactionId,
    currency: params.currency ?? undefined,
    value: params.value ?? undefined,
    tax: params.tax ?? undefined,
    shipping: params.shipping ?? undefined,
    coupon: params.coupon ?? undefined,
    affiliation: params.affiliation ?? undefined,
    items: params.items,
  });
}

export function pushCustomEvent(event: string, payload?: Record<string, Primitive>) {
  pushToDataLayer({
    event,
    ...(payload ?? {}),
  });
}
