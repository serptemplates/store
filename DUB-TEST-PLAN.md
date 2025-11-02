# Dub Attribution Testing - serp.cc/mds

## Test Setup

**Test Link**: `serp.cc/mds`
**Expected Destination**: A product page on `apps.serp.co`

## Step-by-Step Test

### 1. Clear Browser State
```javascript
// Open browser console and run:
document.cookie.split(';').forEach(c => {
  document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.serp.co';
});
location.reload();
```

### 2. Visit Dub Link
- Navigate to: `https://serp.cc/mds`
- Should redirect to a product page on `apps.serp.co`

### 3. Verify Cookie Was Set
```javascript
// In browser console:
document.cookie.split(';').find(c => c.includes('dub_id'))
// Expected output: " dub_id=dub_id_XXXXXXXX" or similar
```

### 4. Check Product Data
```javascript
// In browser console, check if product has price_id:
// (This will determine if programmatic checkout is used)
console.log('Product has price_id:', window.__PRODUCT_DATA__?.stripe?.price_id)
```

### 5. Click "Get it Now" Button
- Click the buy/purchase button
- **Expected behavior**:
  - If price_id exists: Should redirect to `https://checkout.stripe.com/c/pay/cs_test_...` or `https://checkout.stripe.com/c/pay/cs_live_...`
  - If no price_id: Should redirect to Payment Link URL (e.g., `buy.stripe.com/...`)

### 6. Open Network Tab
**Before clicking buy button:**
- Open Developer Tools → Network tab
- Click "Get it Now"
- Look for POST request to `/api/checkout/session`

**Expected request payload**:
```json
{
  "priceId": "price_...",
  "quantity": 1,
  "mode": "payment",
  "dubCustomerExternalId": "dub_id_XXXXXXXX",
  "dubClickId": "dub_id_XXXXXXXX",
  "clientReferenceId": "dub_id_XXXXXXXX"
}
```

**Expected response**:
```json
{
  "id": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "status": "open"
}
```

### 7. Complete Test Purchase (Stripe Test Mode)
If using test mode:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/25`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

### 8. Check Stripe Webhook
After checkout completes:
- Go to Stripe Dashboard → Developers → Webhooks
- Find the `checkout.session.completed` event
- Click to view details
- Check metadata:

**Expected metadata**:
```json
{
  "dubCustomerExternalId": "dub_id_XXXXXXXX",
  "dubClickId": "dub_id_XXXXXXXX"
}
```

### 9. Check Dub Dashboard
- Log into Dub dashboard
- Navigate to Partner Program / Analytics
- Look for the conversion attribution
- **Expected**: Sale should be attributed to the affiliate who owns `serp.cc/mds`

## Troubleshooting

### Issue: No dub_id cookie set
**Check**: 
1. Is DubAnalytics component loaded? Look for Dub script in page source
2. Does URL have `?dub_id=xxx` parameter after redirect?
3. Check cookie domain setting (should be `.serp.co`)

### Issue: Buy button goes to Payment Link instead of creating session
**Possible causes**:
1. Product JSON doesn't have `stripe.price_id` field
2. Check which product `serp.cc/mds` redirects to
3. Verify product JSON has price_id: `apps/store/data/products/[product-name].json`

### Issue: POST /api/checkout/session fails
**Check**:
1. Browser console for errors
2. Network tab for error response
3. Stripe API key is configured (STRIPE_SECRET_KEY env var)

### Issue: Dub doesn't attribute the sale
**Check**:
1. Dub Stripe app is installed and active
2. Webhook metadata includes `dubCustomerExternalId`
3. The value matches the format: `dub_id_XXXXXXXX`
4. Dub app has permission to read Stripe webhook events

## Expected Results Summary

✅ **Cookie Set**: `dub_id` cookie present after visiting `serp.cc/mds`
✅ **API Called**: POST to `/api/checkout/session` when clicking buy button
✅ **Metadata Present**: `dubCustomerExternalId` in request payload
✅ **Session Created**: Valid Stripe checkout session URL returned
✅ **Webhook Delivered**: Stripe sends webhook with proper metadata
✅ **Attribution Works**: Dub dashboard shows attributed conversion

## Quick Console Test Script

Run this in browser console after clicking buy button:

```javascript
// Monitor API calls
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (args[0].includes('/api/checkout/session')) {
    console.log('🚀 Checkout API called!');
    console.log('Request:', args[1]);
    const clone = response.clone();
    const data = await clone.json();
    console.log('Response:', data);
  }
  return response;
};

// Check cookie
console.log('🍪 Cookie:', document.cookie.split(';').find(c => c.includes('dub_id')));

// Check product data
console.log('💰 Has Price ID:', !!window.__PRODUCT_DATA__?.stripe?.price_id);
```

## Production vs Test Mode

### Test Mode
- Uses `price_id` starting with `price_test_`
- Checkout URL: `checkout.stripe.com/c/pay/cs_test_...`
- Webhook endpoint should handle test events

### Live Mode
- Uses `price_id` starting with `price_` (no test prefix)
- Checkout URL: `checkout.stripe.com/c/pay/cs_live_...`
- Real money, real attribution

## Notes

- First load may take a moment for Next.js to compile the page
- Cookie expires after 30 days (Dub default)
- If you test multiple times, clear cookies between tests for accurate results
- The `dub_id` value is generated by Dub when someone clicks your affiliate link
