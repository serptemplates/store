"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import {
  pushPurchaseEvent,
  type EcommerceItem,
} from "@/lib/analytics/gtm";

declare global {
  interface Window {
    __SERP_LAST_SESSION_ID?: string;
  }
}

export type ConversionItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type ConversionData = {
  sessionId: string;
  value?: number | null;
  currency?: string | null;
  items?: ConversionItem[];
  coupon?: string | null;
  affiliateId?: string | null;
  paymentLinkId?: string | null;
  productSlug?: string | null;
};

type ConversionTrackingProps = {
  sessionId?: string | null;
  paymentLinkId?: string | null;
  order?: ConversionData | null;
  provider?: string | null;
};

function toEcommerceItems(items?: ConversionItem[]): EcommerceItem[] {
  if (!items || items.length === 0) {
    return [];
  }

  return items.map((item) => ({
    item_id: item.id,
    item_name: item.name,
    price: Number(item.price.toFixed(2)),
    quantity: item.quantity,
  }));
}

export function ConversionTracking({ sessionId, paymentLinkId, order, provider }: ConversionTrackingProps) {
  useEffect(() => {
    const trackingKey =
      sessionId ?? paymentLinkId ?? order?.paymentLinkId ?? null;

    if (!trackingKey || !order) {
      return;
    }

    const storageKey = `tracked_${trackingKey}`;
    const alreadyTracked = sessionStorage.getItem(storageKey);
    if (alreadyTracked === "true") {
      return;
    }

    const ecommerceItems = toEcommerceItems(order.items);
    const transactionId = sessionId ?? trackingKey;

    pushPurchaseEvent({
      transactionId,
      value: order.value ?? undefined,
      currency: order.currency ?? undefined,
      coupon: order.coupon ?? undefined,
      affiliation: provider ?? undefined,
      items: ecommerceItems,
    });

    const amountValue = typeof order.value === "number" ? order.value : null;
    const amountInCents = typeof amountValue === "number" ? Math.round(amountValue * 100) : null;

    try {
      posthog.capture("checkout_completed", {
        source: "client",
        transaction_id: transactionId,
        payment_link_id: order.paymentLinkId ?? null,
        product_slug: order.productSlug ?? null,
        currency: order.currency ?? null,
        amount_total: amountValue,
        amount_total_cents: amountInCents,
        coupon: order.coupon ?? null,
        affiliation: provider ?? null,
        items: ecommerceItems.map((item) => ({
          id: item.item_id,
          name: item.item_name,
          price: item.price,
          quantity: item.quantity,
        })),
      });
    } catch (error) {
      console.warn("posthog.capture checkout_completed failed", error);
    }

    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "purchase", {
        transaction_id: transactionId,
        value: order.value ?? undefined,
        currency: order.currency ?? undefined,
        coupon: order.coupon ?? undefined,
        affiliation: provider ?? undefined,
        items: ecommerceItems,
      });
    }

    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Purchase", {
        value: order.value ?? undefined,
        currency: order.currency ?? undefined,
        content_ids: ecommerceItems.map((item) => item.item_id),
        content_type: "product",
        contents: ecommerceItems.map((item) => ({
          id: item.item_id,
          quantity: item.quantity,
        })),
        num_items: ecommerceItems.reduce(
          (sum, item) => sum + (item.quantity ?? 0),
          0,
        ),
      });
    }

    if (typeof window !== "undefined" && window.ttq && ecommerceItems[0]) {
      window.ttq.track("CompletePayment", {
        content_type: "product",
        content_id: ecommerceItems[0].item_id,
        content_name: ecommerceItems[0].item_name,
        quantity: ecommerceItems[0].quantity,
        price: order.value ?? undefined,
        value: order.value ?? undefined,
        currency: order.currency ?? undefined,
      });
    }

    if (typeof window !== "undefined" && window.twq) {
      window.twq("event", "tw-purchase", {
        value: order.value ?? undefined,
        currency: order.currency ?? undefined,
        conversion_id: transactionId,
      });
    }

    if (typeof window !== "undefined" && window.pintrk) {
      window.pintrk("track", "checkout", {
        value: order.value ?? undefined,
        currency: order.currency ?? undefined,
        order_id: sessionId,
        line_items: ecommerceItems.map((item) => ({
          product_id: item.item_id,
          product_name: item.item_name,
          product_price: item.price,
          product_quantity: item.quantity,
        })),
      });
    }

    if (typeof window !== "undefined") {
      window.__SERP_LAST_SESSION_ID = transactionId;
      try {
        sessionStorage.setItem("tracked_session_id_debug", transactionId);
      } catch {
        // ignore quota errors
      }
    }

    sessionStorage.setItem(storageKey, "true");
  }, [sessionId, paymentLinkId, order, provider]);

  return null;
}
