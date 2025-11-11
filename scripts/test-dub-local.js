#!/usr/bin/env node

/**
 * Local test for Dub attribution implementation
 * Run this while dev server is running on localhost:3000
 */

console.log('🧪 Dub Attribution Local Test\n');

console.log('📋 Test Steps:\n');

console.log('1. Open browser to: http://localhost:3000/onlyfans-downloader?dub_id=test_local_123');
console.log('   This simulates coming from a Dub link with dub_id parameter.\n');

console.log('2. Open Browser Console (F12) and verify the cookie was set:');
console.log('   document.cookie.split(";").find(c => c.includes("dub_id"))');
console.log('   Expected: " dub_id=test_local_123" or " dub_id=dub_id_test_local_123"\n');

console.log('3. Open the Network tab in DevTools before clicking anything.\n');

console.log('4. Click "Get it Now".');
console.log('   - Network tab should show `GET /checkout/onlyfans-downloader` followed by a 302 to `https://checkout.stripe.com/c/pay/cs_test_...`.\n');

console.log('5. Copy the Checkout Session ID from the Stripe URL (the `cs_test_...` fragment).');
console.log('   Use it to inspect metadata via Stripe\'s API:');
console.log('   STRIPE_SECRET_KEY_TEST=sk_test_xxx \\');
console.log('     curl -s -u $STRIPE_SECRET_KEY_TEST: https://api.stripe.com/v1/checkout/sessions/<SESSION_ID>?expand[]=line_items | jq ".metadata"\n');

console.log('   Expected metadata fields:');
console.log('   ✓ dubCustomerExternalId: "dub_id_test_local_123"');
console.log('   ✓ dubClickId: "dub_id_test_local_123"');
console.log('   ✓ client_reference_id: "dub_id_test_local_123"\n');

console.log('6. Complete the test checkout (card 4242...) if you want to exercise the webhook path.\n');

console.log('═══════════════════════════════════════════════════════════\n');

console.log('🔍 Quick verification script to paste in browser console:\n');
console.log(`
// Check if Dub checkout is working
(async () => {
  console.log('🔍 Checking Dub implementation...\n');
  
  // 1. Check cookie
  const cookie = document.cookie.split(';').find(c => c.includes('dub_id'));
  console.log('1. Cookie:', cookie || '❌ NOT SET');
  
  // 2. Listen for navigation to /checkout/<slug>
  const open = window.open;
  window.open = function(...args) {
    console.log('3. window.open called with:', args);
    return open.apply(this, args);
  };
  console.log('\\n👆 Now click "Get it Now" and watch the Network tab for GET /checkout/<slug>');
})();
`);

console.log('═══════════════════════════════════════════════════════════\n');
console.log('✅ Ready to test! Dev server should be running on http://localhost:3000\n');
