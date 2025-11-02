#!/usr/bin/env node

/**
 * Local test for Dub attribution implementation
 * Run this while dev server is running on localhost:3000
 */

console.log('🧪 Dub Attribution Local Test\n');

console.log('📋 Test Steps:\n');

console.log('1. Open browser to: http://localhost:3000/onlyfans-downloader?dub_id=test_local_123');
console.log('   This simulates coming from a Dub link with dub_id parameter\n');

console.log('2. Open Browser Console (F12) and check cookie was set:');
console.log('   document.cookie.split(";").find(c => c.includes("dub_id"))');
console.log('   Expected: " dub_id=test_local_123" or " dub_id=dub_id_test_local_123"\n');

console.log('3. Check product has price_id (open Console and run):');
console.log('   fetch("/onlyfans-downloader").then(r => r.text()).then(html => {');
console.log('     const match = html.match(/"price_id":"([^"]+)"/);');
console.log('     console.log("Price ID:", match ? match[1] : "NOT FOUND");');
console.log('   });\n');

console.log('4. Open Network tab in DevTools before next step\n');

console.log('5. Click "Get it Now" button');
console.log('   Watch for POST request to /api/checkout/session\n');

console.log('6. Check request payload includes:');
console.log('   ✓ dubCustomerExternalId: "dub_id_test_local_123"');
console.log('   ✓ dubClickId: "dub_id_test_local_123"');
console.log('   ✓ priceId: "price_..."');
console.log('   ✓ clientReferenceId: "dub_id_test_local_123"\n');

console.log('7. Response should have:');
console.log('   ✓ url: "https://checkout.stripe.com/c/pay/cs_test_..." or cs_live_...\n');

console.log('8. Browser should redirect to Stripe checkout\n');

console.log('═══════════════════════════════════════════════════════════\n');

console.log('🔍 Quick verification script to paste in browser console:\n');
console.log(`
// Check if Dub checkout is working
(async () => {
  console.log('🔍 Checking Dub implementation...\n');
  
  // 1. Check cookie
  const cookie = document.cookie.split(';').find(c => c.includes('dub_id'));
  console.log('1. Cookie:', cookie || '❌ NOT SET');
  
  // 2. Check if product data is available (React might store it differently)
  const hasReactRoot = !!document.querySelector('#__next');
  console.log('2. React app loaded:', hasReactRoot ? '✅' : '❌');
  
  // 3. Monitor fetch calls
  const originalFetch = window.fetch;
  let checkoutCalled = false;
  window.fetch = async function(...args) {
    const [url, options] = args;
    if (url.includes('/api/checkout/session')) {
      checkoutCalled = true;
      console.log('3. 🎉 Checkout API called!');
      console.log('   URL:', url);
      if (options?.body) {
        const payload = JSON.parse(options.body);
        console.log('   Payload:', payload);
        console.log('   ✓ Has dubCustomerExternalId:', !!payload.dubCustomerExternalId);
        console.log('   ✓ Has dubClickId:', !!payload.dubClickId);
        console.log('   ✓ Has priceId:', !!payload.priceId);
      }
    }
    return originalFetch.apply(this, args);
  };
  
  console.log('\\n👆 Now click the "Get it Now" button');
})();
`);

console.log('═══════════════════════════════════════════════════════════\n');
console.log('✅ Ready to test! Dev server should be running on http://localhost:3000\n');
