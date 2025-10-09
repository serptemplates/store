# Analytics Implementation Examples

This document provides code examples for implementing analytics tracking in custom components.

## Using the useAnalytics Hook

### Example 1: Track Product View in a Custom Component

```tsx
"use client";

import { useEffect } from "react";
import { useAnalytics } from "@/components/analytics/gtm";

export function CustomProductCard({ product }) {
  const { trackViewProduct } = useAnalytics();

  useEffect(() => {
    // Track when product card comes into view
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          trackViewProduct({
            productId: product.slug,
            productName: product.name,
            price: product.price,
            currency: 'USD',
          });
          observer.disconnect(); // Only track once
        }
      });
    });

    const element = document.getElementById(`product-${product.slug}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [product, trackViewProduct]);

  return (
    <div id={`product-${product.slug}`}>
      {/* Product card content */}
    </div>
  );
}
```

### Example 2: Track Custom CTA Button

```tsx
"use client";

import { useAnalytics } from "@/components/analytics/gtm";

export function CustomCtaButton({ product, href }) {
  const { trackClickBuyButton, trackOutboundClick } = useAnalytics();

  const handleClick = () => {
    // Track the button click
    trackClickBuyButton({
      productId: product.slug,
      productName: product.name,
      checkoutType: href.includes('ghl.serp.co') ? 'ghl' : 'stripe',
      price: product.price,
    });

    // Track if it's an outbound link
    if (href.includes('ghl.serp.co')) {
      trackOutboundClick({
        linkUrl: href,
        productName: product.name,
        productId: product.slug,
      });
    }

    // Navigate
    window.location.href = href;
  };

  return (
    <button onClick={handleClick} className="btn-primary">
      Get {product.name} Now
    </button>
  );
}
```

### Example 3: Track Custom Conversion Event

```tsx
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAnalytics } from "@/components/analytics/gtm";

export function NewsletterSignupTracking() {
  const searchParams = useSearchParams();
  const { trackEvent } = useAnalytics();
  const success = searchParams.get("subscribed");

  useEffect(() => {
    if (success === "true") {
      trackEvent("newsletter_signup", {
        method: "footer_form",
        timestamp: new Date().toISOString(),
      });
    }
  }, [success, trackEvent]);

  return null;
}
```

### Example 4: Using TrackedBuyButton Component

```tsx
import { useRouter } from "next/navigation";
import { TrackedBuyButton } from "@/components/analytics/TrackedBuyButton";

export function ProductPricingSection({ product }) {
  const router = useRouter();

  return (
    <div className="pricing-section">
      <h2>{product.name}</h2>
      <p className="price">${product.price}</p>
      
      {/* For internal checkout */}
      <TrackedBuyButton
        productId={product.slug}
        productName={product.name}
        checkoutType="stripe"
        price={product.price}
        onClick={() => router.push(`/checkout?product=${product.slug}`)}
        className="btn-buy"
      >
        Buy Now with Stripe
      </TrackedBuyButton>

      {/* For external GHL link */}
      <TrackedBuyButton
        productId={product.slug}
        productName={product.name}
        checkoutType="ghl"
        price={product.price}
        href="https://ghl.serp.co/payment-link"
        className="btn-buy-ghl"
      >
        Buy via Payment Link
      </TrackedBuyButton>
    </div>
  );
}
```

### Example 5: Track Product Add to Wishlist

```tsx
"use client";

import { useAnalytics } from "@/components/analytics/gtm";

export function WishlistButton({ product }) {
  const { trackEvent } = useAnalytics();

  const handleAddToWishlist = () => {
    // Track custom event
    trackEvent("add_to_wishlist", {
      product_id: product.slug,
      product_name: product.name,
      price: product.price,
      currency: 'USD',
    });

    // Add to wishlist logic (implement your own wishlist functionality)
    // Example: localStorage.setItem('wishlist', JSON.stringify([...wishlist, product.slug]));
  };

  return (
    <button onClick={handleAddToWishlist}>
      Add to Wishlist
    </button>
  );
}
```

### Example 6: Track Search

```tsx
"use client";

import { useState } from "react";
import { useAnalytics } from "@/components/analytics/gtm";

export function ProductSearch() {
  const [query, setQuery] = useState("");
  const { trackEvent } = useAnalytics();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Track search
    trackEvent("search", {
      search_term: query,
      search_location: "header",
    });

    // Perform search (implement your own search functionality)
    // Example: router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <form onSubmit={handleSearch}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
      />
      <button type="submit">Search</button>
    </form>
  );
}
```

### Example 7: Track Video Play

```tsx
"use client";

import { useRef } from "react";
import { useAnalytics } from "@/components/analytics/gtm";

export function ProductVideo({ videoUrl, productName }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { trackEvent } = useAnalytics();
  const hasTrackedPlay = useRef(false);

  const handlePlay = () => {
    if (!hasTrackedPlay.current) {
      trackEvent("video_start", {
        video_url: videoUrl,
        product_name: productName,
        video_title: `${productName} Demo`,
      });
      hasTrackedPlay.current = true;
    }
  };

  const handleComplete = () => {
    trackEvent("video_complete", {
      video_url: videoUrl,
      product_name: productName,
    });
  };

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      onPlay={handlePlay}
      onEnded={handleComplete}
      controls
    />
  );
}
```

## Testing Your Implementation

### 1. Use GA4 Debug Mode

Add to your component temporarily:
```tsx
useEffect(() => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-XXXXXXXXXX', {
      debug_mode: true
    });
  }
}, []);
```

Then check GA4 DebugView in real-time.

### 2. Console Logging

```tsx
const { trackEvent } = useAnalytics();

const handleAction = () => {
  const eventData = {
    product_id: 'test',
    product_name: 'Test Product',
  };
  
  console.log('Tracking event:', eventData);
  trackEvent('custom_action', eventData);
};
```

### 3. Check DataLayer

Open browser console:
```javascript
// View all dataLayer events
console.table(window.dataLayer);

// View last 5 events
console.log(window.dataLayer.slice(-5));

// Filter for specific events
console.log(window.dataLayer.filter(e => e.event === 'purchase'));
```

## Best Practices

1. **Always wrap tracking calls in try-catch** to prevent errors from breaking your app:
```tsx
try {
  trackEvent('custom_event', data);
} catch (error) {
  console.error('Analytics error:', error);
}
```

2. **Use useCallback for event handlers** to prevent unnecessary re-renders:
```tsx
const handleClick = useCallback(() => {
  trackClickBuyButton({ ... });
  // other logic
}, [trackClickBuyButton, ...dependencies]);
```

3. **Memoize complex tracking data**:
```tsx
const trackingData = useMemo(() => ({
  productId: product.slug,
  productName: product.name,
  price: parsePrice(product.pricing?.price),
}), [product]);
```

4. **Don't track on every render** - use useEffect with proper dependencies:
```tsx
useEffect(() => {
  trackViewProduct(data);
}, [product.slug]); // Only track when product changes
```

5. **Validate data before tracking**:
```tsx
const trackProduct = () => {
  if (!product?.slug || !product?.name) {
    console.warn('Invalid product data for tracking');
    return;
  }
  trackViewProduct({ ... });
};
```
