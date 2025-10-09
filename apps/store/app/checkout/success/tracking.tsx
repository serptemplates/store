"use client";

import { useEffect } from "react";
import {
  pushPurchaseEvent,
  type EcommerceItem,
} from "@/lib/analytics/gtm";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    dataLayer?: any[];
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

    if (typeof window.gtag !== "undefined") {
      window.gtag("event", "purchase", {
        transaction_id: sessionId,
        value: order.value ?? undefined,
        currency: order.currency ?? undefined,
        coupon: order.coupon ?? undefined,
        affiliation: provider ?? undefined,
        items: ecommerceItems,
      });
    }

    if (typeof window.fbq !== "undefined") {
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

    if (typeof (window as any).ttq !== "undefined" && ecommerceItems[0]) {
      (window as any).ttq.track("CompletePayment", {
        content_type: "product",
        content_id: ecommerceItems[0].item_id,
        content_name: ecommerceItems[0].item_name,
        quantity: ecommerceItems[0].quantity,
        price: order.value ?? undefined,
        value: order.value ?? undefined,
        currency: order.currency ?? undefined,
      });
    }

    if (typeof (window as any).twq !== "undefined") {
      (window as any).twq("event", "tw-purchase", {
        value: order.value ?? undefined,
        currency: order.currency ?? undefined,
        conversion_id: sessionId,
      });
    }

    if (typeof (window as any).pintrk !== "undefined") {
      (window as any).pintrk("track", "checkout", {
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

    sessionStorage.setItem(`tracked_${sessionId}`, "true");
  }, [sessionId, order, provider]);

  return null;
}
