"use client";

import { useEffect } from "react";
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
};

type ConversionTrackingProps = {
  sessionId?: string | null;
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

export function ConversionTracking({ sessionId, order, provider }: ConversionTrackingProps) {
  useEffect(() => {
    if (!sessionId || !order) {
      return;
    }

    const alreadyTracked = sessionStorage.getItem(`tracked_${sessionId}`);
    if (alreadyTracked === "true") {
      return;
    }

    const ecommerceItems = toEcommerceItems(order.items);

    pushPurchaseEvent({
      transactionId: sessionId,
      value: order.value ?? undefined,
      currency: order.currency ?? undefined,
      coupon: order.coupon ?? undefined,
      affiliation: provider ?? undefined,
      items: ecommerceItems,
    });

    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "purchase", {
        transaction_id: sessionId,
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
        conversion_id: sessionId,
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
      window.__SERP_LAST_SESSION_ID = sessionId;
      try {
        sessionStorage.setItem("tracked_session_id_debug", sessionId);
      } catch {
        // ignore quota errors
      }
    }

    sessionStorage.setItem(`tracked_${sessionId}`, "true");
  }, [sessionId, order, provider]);

  return null;
}
