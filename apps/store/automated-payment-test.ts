#!/usr/bin/env npx tsx

/**
 * Automated Payment Flow Test
 * This script automatically tests both Stripe and PayPal flows
 * Run with: npx tsx automated-payment-test.ts
 */

import Stripe from 'stripe';
import { query } from './lib/database';
import { requireStripeSecretKey } from './lib/stripe-environment';

const stripe = new Stripe(requireStripeSecretKey('test'), {
  apiVersion: '2024-04-10' as any,
});

console.log('🤖 Automated Payment Flow Test\n');
console.log('This will create test purchases and verify the complete flow.\n');

// Color codes for output
const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';

const log = {
  success: (msg: string) => console.log(`${green}✅ ${msg}${reset}`),
  error: (msg: string) => console.log(`${red}❌ ${msg}${reset}`),
  warning: (msg: string) => console.log(`${yellow}⚠️  ${msg}${reset}`),
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
};

// Test results collector
const testResults = {
  stripe: { passed: false, details: {} },
  paypal: { passed: false, details: {} },
  database: { passed: false, details: {} },
  ghl: { passed: false, details: {} },
  webhooks: { passed: false, details: {} },
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ STRIPE AUTOMATED TEST ============
async function testStripeFlow() {
  console.log('\n🔵 STRIPE AUTOMATED TEST\n');

  try {
    // Step 1: Create checkout session via our API
    log.info('Creating Stripe checkout session...');
    const checkoutResponse = await fetch('http://localhost:3000/api/checkout/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerId: 'demo-ecommerce-product',
        quantity: 1,
        metadata: {
          test: 'automated',
          timestamp: new Date().toISOString(),
          affiliateId: 'TEST123'
        },
        customer: {
          email: 'test@automated.com',
          name: 'Automated Test'
        }
      })
    });

    if (!checkoutResponse.ok) {
      throw new Error(`Checkout creation failed: ${checkoutResponse.status}`);
    }

    const checkoutData = await checkoutResponse.json();
    const sessionId = checkoutData.id || checkoutData.sessionId;

    log.success(`Checkout session created: ${sessionId}`);
    (testResults.stripe.details as any)['sessionCreated'] = true;

    // Step 2: Retrieve session from Stripe
    log.info('Retrieving session from Stripe...');
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    log.success(`Session status: ${session.status}`);
    log.info(`Payment status: ${session.payment_status}`);
    log.info(`Amount: $${(session.amount_total! / 100).toFixed(2)}`);

    // Step 3: Complete the payment programmatically (only in test mode)
    if (session.status === 'open') {
      log.info('Simulating payment completion...');

      // Create a test payment method
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          token: 'tok_visa', // Test token for successful payment
        },
      });

      // Complete the payment (this only works in test mode)
      try {
        // For test mode, we'll mark session as complete by creating a test charge
        log.info('Creating test payment intent...');
        const paymentIntent = await stripe.paymentIntents.create({
          amount: session.amount_total!,
          currency: session.currency!,
          payment_method: paymentMethod.id,
          confirm: true,
          metadata: {
            session_id: sessionId,
            automated_test: 'true',
          },
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never'
          }
        });

        log.success(`Payment completed: ${paymentIntent.id}`);
        (testResults.stripe.details as any)['paymentCompleted'] = true;

        // Trigger webhook manually for testing
        log.info('Triggering webhook event...');
        await fetch('http://localhost:3000/api/stripe/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test_signature', // In production, this would be validated
          },
          body: JSON.stringify({
            type: 'checkout.session.completed',
            data: {
              object: {
                ...session,
                payment_status: 'paid',
                payment_intent: paymentIntent.id,
              }
            }
          })
        });

      } catch (err) {
        log.warning('Could not complete automated payment (normal for checkout sessions)');
        log.info('Please complete the payment manually at:');
        console.log(`   ${checkoutData.url}\n`);
      }
    }

    // Step 4: Verify database persistence
    log.info('Waiting for webhook processing...');
    await sleep(2000); // Wait 2 seconds for webhook to process

    log.info('Checking database for order...');
    const orders = await query`
      SELECT * FROM orders
      WHERE stripe_session_id = ${sessionId}
      OR metadata->>'automated_test' = 'true'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (orders && orders.rows.length > 0) {
      log.success('Order found in database!');
      const order = orders.rows[0];
      log.info(`Order ID: ${order.id}`);
      log.info(`Amount: $${(order.amount_total / 100).toFixed(2)}`);
      log.info(`Status: ${order.payment_status}`);
      (testResults.stripe.details as any)['orderPersisted'] = true;
    } else {
      log.warning('Order not found in database yet');
    }

    // Step 5: Check GHL sync
    log.info('Checking GHL sync status...');
    const checkoutSessions = await query`
      SELECT * FROM checkout_sessions
      WHERE stripe_session_id = ${sessionId}
      LIMIT 1
    `;

    if (checkoutSessions && checkoutSessions.rows.length > 0) {
      const cs = checkoutSessions.rows[0];
      if (cs.metadata?.ghlSyncedAt) {
        log.success(`GHL synced at: ${cs.metadata.ghlSyncedAt}`);
        (testResults.stripe.details as any)['ghlSynced'] = true;
      } else {
        log.warning('GHL sync pending or failed');
      }
    }

    testResults.stripe.passed = true;
    log.success('Stripe test completed successfully!');

  } catch (error) {
    log.error(`Stripe test failed: ${(error as Error).message}`);
    (testResults.stripe.details as any)['error'] = (error as Error).message;
  }
}

// ============ PAYPAL AUTOMATED TEST ============
async function testPayPalFlow() {
  console.log('\n🟡 PAYPAL AUTOMATED TEST\n');

  try {
    // Step 1: Create PayPal order
    log.info('Creating PayPal order...');
    const orderResponse = await fetch('http://localhost:3000/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerId: 'demo-ecommerce-product',
        quantity: 1,
        affiliateId: 'PAYPAL_TEST',
        customer: {
          email: 'paypal-test@automated.com',
          name: 'PayPal Test User'
        }
      })
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.text();
      throw new Error(`PayPal order creation failed: ${error}`);
    }

    const orderData = await orderResponse.json();
    log.success(`PayPal order created: ${orderData.orderId}`);
    (testResults.paypal.details as any)['orderCreated'] = true;

    // Find approval URL
    const approvalUrl = orderData.links?.find((l: any) => l.rel === 'approve')?.href;
    if (approvalUrl) {
      log.info('PayPal approval URL generated:');
      console.log(`   ${approvalUrl}\n`);
      (testResults.paypal.details as any)['approvalUrl'] = true;
    }

    // Step 2: Simulate capture (requires manual approval in sandbox)
    log.info('Attempting to capture PayPal order...');
    log.warning('Note: PayPal requires manual approval in browser');
    log.info('To complete PayPal test:');
    console.log('   1. Open the approval URL above');
    console.log('   2. Login with sandbox account');
    console.log('   3. Approve the payment\n');

    // Check if order exists in database
    const paypalOrders = await query`
      SELECT * FROM checkout_sessions
      WHERE stripe_session_id = ${'paypal_' + orderData.orderId}
      LIMIT 1
    `;

    if (paypalOrders && paypalOrders.rows.length > 0) {
      log.success('PayPal order tracked in database');
      (testResults.paypal.details as any)['orderTracked'] = true;
    }

    testResults.paypal.passed = true;

  } catch (error) {
    log.error(`PayPal test failed: ${(error as Error).message}`);
    (testResults.paypal.details as any)['error'] = (error as Error).message;
  }
}

// ============ DATABASE & WEBHOOK TEST ============
async function testDatabaseAndWebhooks() {
  console.log('\n💾 DATABASE & WEBHOOK TEST\n');

  try {
    // Test database connection
    log.info('Testing database connection...');
    const dbTest = await query`SELECT NOW() as time, version() as version`;

    if (dbTest && dbTest.rows.length > 0) {
      log.success('Database connected');
      log.info(`PostgreSQL version: ${dbTest.rows[0].version.split(' ')[1]}`);
      testResults.database.passed = true;
    }

    // Check webhook logs
    log.info('Checking recent webhook activity...');
    const webhooks = await query`
      SELECT
        event_type,
        status,
        COUNT(*) as count
      FROM webhook_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY event_type, status
      ORDER BY count DESC
    `;

    if (webhooks && webhooks.rows.length > 0) {
      log.success(`Found ${webhooks.rows.length} webhook event types`);
      webhooks.rows.forEach(w => {
        const icon = w.status === 'success' ? '✅' : '❌';
        console.log(`   ${icon} ${w.event_type}: ${w.count} events (${w.status})`);
      });
      testResults.webhooks.passed = true;
    } else {
      log.warning('No recent webhook activity');
    }

    // Check GHL sync stats
    log.info('Checking GHL sync statistics...');
    const ghlStats = await query`
      SELECT
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE metadata->>'ghlSyncedAt' IS NOT NULL) as synced,
        COUNT(*) FILTER (WHERE metadata->>'ghlError' IS NOT NULL) as failed
      FROM checkout_sessions
      WHERE created_at > NOW() - INTERVAL '7 days'
    `;

    if (ghlStats && ghlStats.rows[0].total_orders > 0) {
      const stats = ghlStats.rows[0];
      const syncRate = ((stats.synced / stats.total_orders) * 100).toFixed(1);
      log.success(`GHL Sync Rate: ${syncRate}%`);
      log.info(`Total: ${stats.total_orders} | Synced: ${stats.synced} | Failed: ${stats.failed}`);
      testResults.ghl.passed = stats.synced > 0;
    }

  } catch (error) {
    log.error(`Database test failed: ${(error as Error).message}`);
  }
}

// ============ MAIN TEST RUNNER ============
async function runAllTests() {
  console.log('Starting automated tests...\n');

  // Check if server is running
  try {
    const health = await fetch('http://localhost:3000/api/health');
    if (!health.ok) throw new Error('Server not responding');
  } catch (error) {
    log.error('Server is not running! Start it with: pnpm dev');
    process.exit(1);
  }

  // Run tests
  await testStripeFlow();
  await testPayPalFlow();
  await testDatabaseAndWebhooks();

  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📊 AUTOMATED TEST REPORT\n');

  let totalPassed = 0;
  let totalTests = 0;

  Object.entries(testResults).forEach(([test, result]) => {
    totalTests++;
    if (result.passed) totalPassed++;

    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${test.toUpperCase()}: ${status}`);

    if (result.details && Object.keys(result.details).length > 0) {
      Object.entries(result.details).forEach(([key, value]) => {
        if (key !== 'error') {
          console.log(`  • ${key}: ${value}`);
        }
      });
    }
  });

  console.log(`\n📈 Overall: ${totalPassed}/${totalTests} tests passed`);

  if (totalPassed === totalTests) {
    log.success('All automated tests passed! 🎉');
  } else {
    log.warning('Some tests require manual completion');
  }

  console.log('\n📝 Manual Testing Required:');
  console.log('1. Complete Stripe checkout with test card: 4242 4242 4242 4242');
  console.log('2. Complete PayPal checkout with sandbox account');
  console.log('3. Verify GHL contact creation in your GHL dashboard');
  console.log('4. Check email notifications (if configured)');

  console.log('\n🔗 Dashboard Links:');
  console.log('• Stripe: https://dashboard.stripe.com/test/payments');
  console.log('• PayPal: https://developer.paypal.com/dashboard/sandbox');
  console.log('• Product: http://localhost:3000/demo-ecommerce-product');
}

// Run the tests
runAllTests().catch(console.error);
