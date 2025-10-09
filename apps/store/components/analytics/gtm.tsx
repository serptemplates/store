"use client";

import { useEffect } from "react";
import Script from "next/script";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

export function GoogleTagManager() {
  if (!GTM_ID) return null;

  return (
    <>
      {/* Google Tag Manager */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `,
        }}
      />

      {/* GTM noscript fallback */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}

export function GoogleAnalytics() {
  if (!GA4_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA4_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}

export function FacebookPixel() {
  if (!FB_PIXEL_ID) return null;

  return (
    <Script
      id="facebook-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${FB_PIXEL_ID}');
          fbq('track', 'PageView');
        `,
      }}
    />
  );
}

// Enhanced Analytics Tracking Hook
export function useAnalytics() {
  const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
    // Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, parameters);
    }

    // Google Tag Manager
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: eventName,
        ...parameters,
      });
    }

    // Facebook Pixel
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', eventName, parameters);
    }
  };

  const trackPageView = (url?: string) => {
    const pageUrl = url || window.location.pathname;

    // GA4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', GA4_ID, {
        page_path: pageUrl,
      });
    }

    // Facebook
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }

    // GTM
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'pageview',
        page: pageUrl,
      });
    }
  };

  const trackViewProduct = (data: {
    productId: string;
    productName: string;
    price: number;
    currency?: string;
  }) => {
    const currency = data.currency || 'USD';
    
    // Prefer dataLayer (GTM) as primary method
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'view_product',
        product_id: data.productId,
        product_name: data.productName,
        price: data.price,
        currency: currency,
      });
    }
    
    // GA4 - view_item event (fallback)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'view_item', {
        currency: currency,
        value: data.price,
        items: [{
          item_id: data.productId,
          item_name: data.productName,
          price: data.price,
          quantity: 1,
        }],
      });
    }

    // Facebook Pixel - ViewContent
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'ViewContent', {
        content_name: data.productName,
        content_ids: [data.productId],
        content_type: 'product',
        value: data.price,
        currency: currency,
      });
    }
  };

  const trackClickBuyButton = (data: {
    productId: string;
    productName: string;
    checkoutType: 'stripe' | 'paypal' | 'ghl';
    price?: number;
  }) => {
    // Prefer dataLayer (GTM) as primary method
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'click_buy_button',
        product_id: data.productId,
        product_name: data.productName,
        checkout_type: data.checkoutType,
        value: data.price,
      });
    }
    
    // GA4 - custom event (fallback)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'click_buy_button', {
        product_id: data.productId,
        product_name: data.productName,
        checkout_type: data.checkoutType,
        value: data.price,
        // Use beacon transport for redirects to prevent event loss
        transport_type: 'beacon',
      });
    }

    // Store product info in cookies for GHL flow
    if (data.checkoutType === 'ghl') {
      document.cookie = `ghl_checkout=1;path=/;max-age=86400;SameSite=Lax`;
      document.cookie = `ghl_product=${data.productId};path=/;max-age=86400;SameSite=Lax`;
      if (data.price) {
        document.cookie = `ghl_price=${data.price};path=/;max-age=86400;SameSite=Lax`;
      }
    }
  };

  const trackBeginCheckout = (data: {
    productName: string;
    value?: number;
    currency?: string;
    productId?: string;
  }) => {
    const currency = data.currency || 'USD';
    
    // Build event payload, omitting value if not provided
    const eventData: any = {
      currency: currency,
      items: [{
        item_id: data.productId || data.productName,
        item_name: data.productName,
        quantity: 1,
      }],
    };
    
    // Only include value if it's a valid number (not 0 or undefined)
    if (data.value && data.value > 0) {
      eventData.value = data.value;
      eventData.items[0].price = data.value;
    }
    
    // Prefer dataLayer (GTM) as primary method
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'begin_checkout',
        product_name: data.productName,
        ...(data.value && data.value > 0 ? { value: data.value } : {}),
        currency: currency,
      });
    }
    
    // GA4 - begin_checkout event (fallback if GTM not available)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'begin_checkout', eventData);
    }

    // Facebook Pixel - InitiateCheckout
    if (typeof window !== 'undefined' && (window as any).fbq) {
      const fbData: any = {
        content_name: data.productName,
        content_ids: [data.productId || data.productName],
        content_type: 'product',
        currency: currency,
        num_items: 1,
      };
      
      if (data.value && data.value > 0) {
        fbData.value = data.value;
      }
      
      (window as any).fbq('track', 'InitiateCheckout', fbData);
    }
  };

  const trackOutboundClick = (data: {
    linkUrl: string;
    productName?: string;
    productId?: string;
  }) => {
    // Prefer dataLayer (GTM) as primary method
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'outbound_click',
        link_url: data.linkUrl,
        product_name: data.productName,
        product_id: data.productId,
      });
    }
    
    // GA4 - custom event for outbound clicks (fallback)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'outbound_click', {
        link_url: data.linkUrl,
        product_name: data.productName,
        product_id: data.productId,
        // Use beacon transport for navigation events
        transport_type: 'beacon',
      });
    }
  };

  const trackPurchase = (data: {
    transactionId: string;
    value: number;
    currency: string;
    items?: Array<{ id: string; name: string; price: number; quantity: number }>;
    paymentProvider?: string;
  }) => {
    // Build GA4-compliant items array
    const ga4Items = data.items?.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })) || [];
    
    // Prefer dataLayer (GTM) as primary method
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'purchase',
        transaction_id: data.transactionId,
        value: data.value,
        currency: data.currency,
        payment_provider: data.paymentProvider,
        items: ga4Items,
      });
    }
    
    // GA4 - purchase event (fallback)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'purchase', {
        transaction_id: data.transactionId,
        value: data.value,
        currency: data.currency,
        items: ga4Items,
        transport_type: 'beacon',
      });
    }

    // Facebook Pixel - Purchase
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Purchase', {
        value: data.value,
        currency: data.currency,
        content_ids: data.items?.map(item => item.id) || [],
        content_type: 'product',
        contents: data.items?.map(item => ({
          id: item.id,
          quantity: item.quantity,
        })),
        num_items: data.items?.reduce((sum, item) => sum + item.quantity, 0) || 1,
      });
    }
  };

  const trackAddToCart = (data: {
    itemId: string;
    itemName: string;
    value: number;
    currency: string;
  }) => {
    trackEvent('add_to_cart', {
      currency: data.currency,
      value: data.value,
      items: [{
        item_id: data.itemId,
        item_name: data.itemName,
        price: data.value,
        quantity: 1,
      }],
    });
  };

  const trackViewContent = (data: {
    contentId: string;
    contentName: string;
    contentType: string;
    value?: number;
    currency?: string;
  }) => {
    trackEvent('view_item', {
      currency: data.currency || 'USD',
      value: data.value || 0,
      items: [{
        item_id: data.contentId,
        item_name: data.contentName,
        item_category: data.contentType,
      }],
    });
  };

  return {
    trackEvent,
    trackPageView,
    trackViewProduct,
    trackClickBuyButton,
    trackBeginCheckout,
    trackOutboundClick,
    trackPurchase,
    trackAddToCart,
    trackViewContent,
  };
}