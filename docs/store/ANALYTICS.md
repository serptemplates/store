# Analytics & Conversion Tracking Implementation

This document describes the comprehensive GA4 and ecommerce conversion tracking implementation for apps.serp.co.

## Overview

The implementation provides enterprise-level analytics and conversion tracking across the entire customer journey, from product page views to successful purchases. It supports multiple checkout methods (Stripe, PayPal, and GHL payment links) and provides detailed insights into user behavior.

## Events Tracked

### 1. `view_product` (Product Page View)
**Purpose**: Track when users view a product landing page  
**When it fires**: Automatically when a product page loads  
**Parameters**:
- `product_id`: Product slug (e.g., "tiktok-downloader")
- `product_name`: Product name
- `price`: Product price (USD)
- `currency`: "USD"

**Implementation**: `ProductPageTracking` component

### 2. `click_buy_button` (Purchase Intent)
**Purpose**: Measure when users click any buy/checkout button  
**When it fires**: On click of:
- Main pricing CTA buttons
- Sticky header buy buttons
- Product info section checkout buttons

**Parameters**:
- `product_id`: Product slug
- `product_name`: Product name
- `checkout_type`: "stripe", "paypal", or "ghl"
- `price`: Product price (if available)

**Implementation**: `useAnalytics().trackClickBuyButton()` called in button click handlers

### 3. `begin_checkout` (Checkout Started)
**Purpose**: Track when users reach the checkout page  
**When it fires**: On checkout page load with `?product=` parameter  
**Parameters**:
- `product_name`: Product slug from URL
- `product_id`: Product slug
- `value`: Product price (0 as placeholder, should be enhanced)
- `currency`: "USD"

**Implementation**: `CheckoutPageTracking` component

### 4. `purchase` (Successful Conversion)
**Purpose**: Track completed purchases  
**When it fires**: On checkout success page (`/checkout/success?session_id=...`)  
**Parameters**:
- `transaction_id`: Session/order ID
- `value`: Order total
- `currency`: "USD"
- `items`: Array of purchased items
- `payment_provider`: "stripe", "paypal", or "ghl"

**Implementation**: `ConversionTracking` component with API integration

### 5. `outbound_click` (External Checkout Link)
**Purpose**: Track clicks to external checkout pages (GHL, PayPal)  
**When it fires**: When users click external payment links  
**Parameters**:
- `link_url`: Destination URL
- `product_name`: Product name
- `product_id`: Product slug

**Implementation**: `useAnalytics().trackOutboundClick()`

## Components

### Analytics Components

#### `ProductPageTracking`
- Tracks `view_product` event when product pages load
- Automatically extracts price from product data
- Used in both ClientHomeView and HybridProductPageView

#### `CheckoutPageTracking`
- Tracks `begin_checkout` event when checkout page loads
- Reads product slug from URL parameters
- Triggers Facebook Pixel `InitiateCheckout` event

#### `ConversionTracking`
- Enhanced purchase tracking with real order data
- Fetches order details from `/api/orders/[session_id]` endpoint
- Falls back to cookies for GHL flow
- Prevents duplicate tracking using sessionStorage
- Clears GHL checkout cookies after tracking

#### `TrackedBuyButton` (Utility Component)
- Reusable button component with built-in tracking
- Supports both button and anchor elements
- Automatically tracks buy button clicks and outbound links

### Analytics Hook

#### `useAnalytics()`
Provides methods for tracking custom events:
- `trackViewProduct(data)`
- `trackClickBuyButton(data)`
- `trackBeginCheckout(data)`
- `trackOutboundClick(data)`
- `trackPurchase(data)`
- `trackEvent(eventName, parameters)` - Generic event tracker

## API Endpoints

### `/api/orders/[session_id]`
**Purpose**: Fetch order details for accurate purchase tracking  
**Method**: GET  
**Response**:
```json
{
  "orderId": "order_123",
  "offerId": "product-slug",
  "value": 97.00,
  "currency": "USD",
  "items": [
    {
      "id": "product-slug",
      "name": "Product Name",
      "price": 97.00,
      "quantity": 1
    }
  ],
  "paymentProvider": "stripe",
  "customerEmail": "user@example.com",
  "createdAt": "2025-10-09T12:00:00Z"
}
```

## GHL (GoHighLevel) Payment Link Support

For external GHL checkout flows, the implementation uses cookies to preserve tracking data:

### Cookie Flow
1. **On Buy Button Click** (GHL destination):
   - `ghl_checkout=1` - Flags this as a GHL checkout
   - `ghl_product={productId}` - Stores product identifier
   - `ghl_price={price}` - Stores product price
   - Cookies expire in 24 hours (86400 seconds)

2. **On Success Page Return**:
   - ConversionTracking reads cookies if API data unavailable
   - Fires purchase event with cookie data
   - Clears cookies after successful tracking

### GHL Link Format
External GHL links should include UTM parameters for attribution:
```
https://ghl.serp.co/payment-link?utm_source=store&utm_medium=referral&utm_campaign=product-name
```

## Platform Support

### Google Analytics 4 (GA4)
- All events fire using `gtag('event', eventName, parameters)`
- Supports Enhanced Ecommerce tracking
- Item-level tracking with proper schema

### Google Tag Manager (GTM)
- All events also pushed to `dataLayer`
- Enables custom GTM triggers and tags
- Supports event-based tracking rules

### Facebook Pixel
- Automatic conversion to Facebook Pixel events:
  - `view_product` → `ViewContent`
  - `click_buy_button` → (custom event)
  - `begin_checkout` → `InitiateCheckout`
  - `purchase` → `Purchase`

## Cross-Domain Tracking

To enable cross-domain tracking between `apps.serp.co` and `ghl.serp.co`:

1. In GA4 Admin → Data Streams → Web → Configure Tag Settings
2. Configure Your Domains: Add:
   - `apps.serp.co`
   - `ghl.serp.co`
   - `store.serp.co`

This ensures user sessions persist across domain boundaries.

## Testing

### Manual Testing Checklist
- [ ] Product page loads - verify `view_product` fires
- [ ] Click buy button - verify `click_buy_button` fires
- [ ] Reach checkout page - verify `begin_checkout` fires
- [ ] Complete Stripe purchase - verify `purchase` fires with real data
- [ ] Complete PayPal purchase - verify `purchase` fires
- [ ] Click GHL external link - verify `outbound_click` fires
- [ ] Return from GHL purchase - verify `purchase` fires with cookie data

### Browser Console Testing
```javascript
// Check if GTM is loaded
console.log('GTM:', window.dataLayer);

// Check if GA4 is loaded
console.log('GA4:', typeof window.gtag);

// View recent dataLayer events
console.log(window.dataLayer.slice(-5));
```

## Analytics Reports

### Recommended GA4 Reports

1. **Conversion Funnel**
   - Step 1: `view_product`
   - Step 2: `click_buy_button`
   - Step 3: `begin_checkout`
   - Step 4: `purchase`

2. **Product Performance**
   - Dimension: `product_name`
   - Metrics: Views, Click-through rate, Conversion rate

3. **Checkout Abandonment**
   - Formula: `(begin_checkout - purchase) / begin_checkout * 100`
   - Breakdown by `product_name`, `source`, `device`

4. **Traffic Sources**
   - Report: Acquisition → Traffic Acquisition
   - See where buyers come from

5. **Revenue by Product**
   - Event: `purchase`
   - Dimension: `product_name` (from items)
   - Metric: `value`

## Environment Variables

Required environment variables for analytics:
```env
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FB_PIXEL_ID=XXXXXXXXXXXXXX
```

## Best Practices

1. **Always Use Descriptive Product Names**: Ensure product slugs and names are consistent
2. **Include Prices When Available**: Pass numeric prices to all tracking functions
3. **Test Thoroughly**: Use GA4 DebugView to verify events fire correctly
4. **Monitor Cookie Size**: GHL cookies are minimal but should be cleaned up
5. **Handle API Failures Gracefully**: ConversionTracking falls back to cookies/defaults

## Troubleshooting

### Events Not Firing
1. Check browser console for errors
2. Verify GTM/GA4 IDs are set in environment variables
3. Check DebugView in GA4 (enable with `gtag('config', 'GA4_ID', {debug_mode: true})`)
4. Disable ad blockers during testing

### Duplicate Purchase Events
- ConversionTracking uses sessionStorage to prevent duplicates
- Key: `tracked_{sessionId}`
- If cleared manually, event may fire again

### Missing Order Data
- Verify database connection in `/api/orders/[session_id]`
- Check order table schema matches query
- Ensure metadata is properly JSON formatted

## Future Enhancements

- [ ] Add user identification (email) to all events when available
- [ ] Implement server-side tracking via GA4 Measurement Protocol
- [ ] Add TikTok Pixel support
- [ ] Enhanced attribution modeling
- [ ] A/B testing integration
- [ ] Checkout abandonment email recovery
