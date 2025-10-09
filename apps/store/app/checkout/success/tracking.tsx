"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { parseCookies, parsePriceString, clearTrackingCookies } from "@/lib/analytics-utils";

type ConversionData = {
  sessionId: string;
  value?: number;
  currency?: string;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
};

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export function ConversionTracking() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) return;

    // Fetch session details for accurate tracking
    const trackConversion = async () => {
      try {
        const storageKey = `tracked_${sessionId}`;
        
        // Check if we've already tracked this conversion (early return)
        if (sessionStorage.getItem(storageKey)) {
          return;
        }

        // Mark as tracked immediately to prevent race conditions
        sessionStorage.setItem(storageKey, "true");

        // Try to fetch actual order data from API
        let orderData: {
          value: number;
          currency: string;
          items: Array<{
            id: string;
            name: string;
            price: number;
            quantity: number;
          }>;
          paymentProvider?: string;
        };

        try {
          const response = await fetch(`/api/orders/${sessionId}`);
          if (response.ok) {
            const data = await response.json();
            orderData = {
              value: data.value || 97.00,
              currency: data.currency || "USD",
              items: data.items || [
                {
                  id: data.offerId || "product-1",
                  name: data.items?.[0]?.name || "Product",
                  price: data.value || 97.00,
                  quantity: 1
                }
              ],
              paymentProvider: data.paymentProvider,
            };
          } else {
            // Fallback to cookies or default data if API fails
            const cookies = parseCookies();
            
            orderData = {
              value: parsePriceString(cookies.ghl_price) || 97.00,
              currency: "USD",
              items: [
                {
                  id: cookies.ghl_product || "product-1",
                  name: (cookies.ghl_product || "product-1").replace(/-/g, ' '),
                  price: parsePriceString(cookies.ghl_price) || 97.00,
                  quantity: 1
                }
              ],
              paymentProvider: cookies.ghl_checkout === '1' ? 'ghl' : 'unknown',
            };
          }
        } catch (fetchError) {
          // Fallback to default data if fetch fails
          console.warn("Failed to fetch order data, using fallback:", fetchError);
          orderData = {
            value: 97.00,
            currency: "USD",
            items: [
              {
                id: "product-1",
                name: "Product Name",
                price: 97.00,
                quantity: 1
              }
            ]
          };
        }

        // Build GA4-compliant items array
        const ga4Items = orderData.items.map(item => ({
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity
        }));

        // Prefer dataLayer (GTM) as primary tracking method
        if (Array.isArray(window.dataLayer)) {
          window.dataLayer.push({
            event: "purchase",
            ecommerce: {
              transaction_id: sessionId,
              value: orderData.value,
              currency: orderData.currency,
              payment_provider: orderData.paymentProvider,
              items: ga4Items,
            },
          });
        } else if (typeof window.gtag === "function") {
          // Fallback to gtag if dataLayer is not available
          window.gtag("event", "purchase", {
            transaction_id: sessionId,
            value: orderData.value,
            currency: orderData.currency,
            items: ga4Items,
            transport_type: "beacon",
          });
        }

        // Facebook Pixel - Purchase Event
        if (typeof window.fbq !== "undefined") {
          window.fbq("track", "Purchase", {
            value: orderData.value,
            currency: orderData.currency,
            content_ids: orderData.items.map(item => item.id),
            content_type: "product",
            contents: orderData.items.map(item => ({
              id: item.id,
              quantity: item.quantity
            })),
            num_items: orderData.items.reduce((sum, item) => sum + item.quantity, 0)
          });
        }

        // TikTok Pixel (if configured)
        if (typeof (window as any).ttq !== "undefined") {
          (window as any).ttq.track("CompletePayment", {
            content_type: "product",
            content_id: orderData.items[0]?.id,
            content_name: orderData.items[0]?.name,
            quantity: orderData.items[0]?.quantity,
            price: orderData.value,
            value: orderData.value,
            currency: orderData.currency
          });
        }

        // Twitter Pixel (if configured)
        if (typeof (window as any).twq !== "undefined") {
          (window as any).twq("event", "tw-purchase", {
            value: orderData.value,
            currency: orderData.currency,
            conversion_id: sessionId,
            email_address: "" // Add if available
          });
        }

        // Pinterest Tag (if configured)
        if (typeof (window as any).pintrk !== "undefined") {
          (window as any).pintrk("track", "checkout", {
            value: orderData.value,
            currency: orderData.currency,
            order_id: sessionId,
            line_items: orderData.items.map(item => ({
              product_id: item.id,
              product_name: item.name,
              product_price: item.price,
              product_quantity: item.quantity
            }))
          });
        }
        
        // Clear GHL checkout cookies after successful tracking
        if (document.cookie.includes('ghl_checkout')) {
          clearTrackingCookies();
        }

      } catch (error) {
        console.error("Error tracking conversion:", error);
        // Remove the tracking flag on error so it can be retried
        sessionStorage.removeItem(`tracked_${sessionId}`);
      }
    };

    trackConversion();
  }, [sessionId]);

  return null;
}