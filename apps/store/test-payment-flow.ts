#!/usr/bin/env npx tsx

/**
 * Test script to verify payment flow and data passing
 * Run with: npx tsx test-payment-flow.ts
 */

import { query } from './lib/database';

console.log('🧪 Payment Flow Test Suite\n');

// Test 1: Check Environment Variables
console.log('1️⃣ Checking Environment Variables...');
const requiredEnvVars = {
  stripe: [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_CHECKOUT_URL'
  ],
  paypal: [
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'NEXT_PUBLIC_PAYPAL_CLIENT_ID'
  ],
  ghl: [
    'GHL_PAT_LOCATION',
    'GHL_LOCATION_ID',
    'GHL_API_BASE_URL'
  ],
  database: [
    'DATABASE_URL'
  ]
};

let allConfigured = true;
for (const [service, vars] of Object.entries(requiredEnvVars)) {
  console.log(`\n  ${service.toUpperCase()}:`);
  for (const varName of vars) {
    const isSet = !!process.env[varName];
    const status = isSet ? '✅' : '❌';
    console.log(`    ${status} ${varName}: ${isSet ? 'Configured' : 'MISSING'}`);
    if (!isSet) allConfigured = false;
  }
}

// Test 2: Database Connection
console.log('\n2️⃣ Testing Database Connection...');
try {
  const result = await query`SELECT NOW() as current_time`;
  if (result) {
    console.log('  ✅ Database connected successfully');
    console.log(`  📅 Server time: ${result.rows[0].current_time}`);
  } else {
    console.log('  ⚠️  Database configured but no connection');
  }
} catch (error) {
  console.log('  ❌ Database connection failed:', (error as Error).message);
}

// Test 3: Check Recent Orders
console.log('\n3️⃣ Checking Recent Orders...');
try {
  const orders = await query`
    SELECT
      source,
      payment_method,
      payment_status,
      amount_total,
      customer_email,
      created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 5
  `;

  if (orders && orders.rows.length > 0) {
    console.log(`  📦 Found ${orders.rows.length} recent orders:`);
    orders.rows.forEach((order, i) => {
      const amount = (order.amount_total / 100).toFixed(2);
      console.log(`    ${i + 1}. ${order.source}/${order.payment_method} - $${amount} - ${order.payment_status} - ${order.customer_email || 'No email'}`);
    });
  } else {
    console.log('  ℹ️  No orders found yet (this is normal if you haven\'t made test purchases)');
  }
} catch (error) {
  console.log('  ⚠️  Could not fetch orders:', (error as Error).message);
}

// Test 4: Check Webhook Logs
console.log('\n4️⃣ Checking Webhook Activity...');
try {
  const webhooks = await query`
    SELECT
      payment_intent_id,
      event_type,
      status,
      last_error,
      created_at
    FROM webhook_logs
    ORDER BY created_at DESC
    LIMIT 5
  `;

  if (webhooks && webhooks.rows.length > 0) {
    console.log(`  📨 Found ${webhooks.rows.length} recent webhook events:`);
    webhooks.rows.forEach((webhook, i) => {
      const status = webhook.status === 'success' ? '✅' : '❌';
      console.log(`    ${i + 1}. ${status} ${webhook.event_type} - ${webhook.status}`);
      if (webhook.last_error) {
        console.log(`       Error: ${webhook.last_error}`);
      }
    });
  } else {
    console.log('  ℹ️  No webhook events yet');
  }
} catch (error) {
  console.log('  ⚠️  Could not fetch webhook logs:', (error as Error).message);
}

// Test 5: GHL Sync Status
console.log('\n5️⃣ Checking GHL Sync Status...');
try {
  const ghlSync = await query`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE metadata->>'ghlSyncedAt' IS NOT NULL) as synced
    FROM checkout_sessions
    WHERE created_at > NOW() - INTERVAL '7 days'
  `;

  if (ghlSync && ghlSync.rows[0].total > 0) {
    const syncRate = (ghlSync.rows[0].synced / ghlSync.rows[0].total * 100).toFixed(1);
    console.log(`  📊 GHL Sync Rate: ${syncRate}% (${ghlSync.rows[0].synced}/${ghlSync.rows[0].total})`);
  } else {
    console.log('  ℹ️  No recent checkout sessions to sync');
  }
} catch (error) {
  console.log('  ⚠️  Could not check GHL sync:', (error as Error).message);
}

// Test 6: Create Test Checkout Session
console.log('\n6️⃣ Testing Stripe Checkout Creation...');
try {
  const response = await fetch('http://localhost:3000/api/checkout/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      offerId: 'demo-ecommerce-product',
      quantity: 1,
      metadata: {
        test: 'true',
        source: 'test-script'
      }
    })
  });

  if (response.ok) {
    const data = await response.json();
    console.log('  ✅ Stripe checkout session created successfully');
    console.log(`  🔗 Checkout URL: ${data.url?.substring(0, 50)}...`);
  } else {
    console.log(`  ❌ Failed to create checkout session: ${response.status}`);
    const error = await response.text();
    console.log(`     Error: ${error}`);
  }
} catch (error) {
  console.log('  ❌ Could not reach checkout API:', (error as Error).message);
}

// Test 7: Test PayPal Order Creation
console.log('\n7️⃣ Testing PayPal Order Creation...');
try {
  const response = await fetch('http://localhost:3000/api/paypal/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      offerId: 'demo-ecommerce-product',
      quantity: 1
    })
  });

  if (response.ok) {
    const data = await response.json();
    console.log('  ✅ PayPal order created successfully');
    console.log(`  🆔 Order ID: ${data.orderId}`);
    const approveLink = data.links?.find((l: any) => l.rel === 'approve');
    if (approveLink) {
      console.log(`  🔗 Approval URL: ${approveLink.href.substring(0, 50)}...`);
    }
  } else {
    const errorText = await response.text();
    if (errorText.includes('not configured')) {
      console.log('  ⚠️  PayPal not configured (check credentials)');
    } else {
      console.log(`  ❌ Failed to create PayPal order: ${response.status}`);
      console.log(`     Error: ${errorText}`);
    }
  }
} catch (error) {
  console.log('  ❌ Could not reach PayPal API:', (error as Error).message);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 TEST SUMMARY\n');

if (allConfigured) {
  console.log('✅ All environment variables are configured');
  console.log('✅ Ready for testing!\n');
  console.log('📝 Next Steps:');
  console.log('1. Make a test purchase with Stripe (use card 4242 4242 4242 4242)');
  console.log('2. Make a test purchase with PayPal sandbox account');
  console.log('3. Check the Stripe Dashboard for webhook events');
  console.log('4. Verify GHL contact was created/updated');
  console.log('5. Run this script again to see the orders in the database');
} else {
  console.log('❌ Some configuration is missing');
  console.log('Please check the missing environment variables above');
}

console.log('\n🔗 Useful Links:');
console.log('- Stripe Test Dashboard: https://dashboard.stripe.com/test/payments');
console.log('- PayPal Sandbox: https://developer.paypal.com/dashboard/sandbox');
console.log('- Product Page: http://localhost:3000/demo-ecommerce-product');

process.exit(0);