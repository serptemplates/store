#!/usr/bin/env npx tsx

/**
 * Test Dub Partner Program attribution with Stripe
 * 
 * This script creates a checkout session with the proper Dub metadata
 * to verify that the Dub Stripe app can track the sale.
 * 
 * Run with: pnpm --filter @apps/store exec tsx scripts/manual-tests/test-dub-attribution.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
const HERE = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(new URL(import.meta.url).pathname);

function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.resolve(dir);
    if (fs.existsSync(path.join(candidate, 'pnpm-workspace.yaml'))) {
      return candidate;
    }
    const parent = path.dirname(candidate);
    if (parent === candidate) break;
    dir = parent;
  }
  return path.resolve(startDir, '../../../..');
}

const REPO_ROOT = findRepoRoot(path.resolve(HERE));
const ENV_CANDIDATES = [
  path.join(process.cwd(), '.env'),
  path.join(REPO_ROOT, '.env'),
];

for (const candidate of ENV_CANDIDATES) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: true });
  }
}

console.log('🧪 Testing Dub Partner Program Attribution\n');

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function resolveStripeSecret(): string | undefined {
  // Prefer test mode
  return (
    process.env.STRIPE_SECRET_KEY_TEST ||
    process.env.STRIPE_TEST_SECRET_KEY ||
    (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? process.env.STRIPE_SECRET_KEY : undefined) ||
    process.env.STRIPE_SECRET_KEY
  );
}

const STRIPE_KEY = resolveStripeSecret();
if (!isNonEmptyString(STRIPE_KEY)) {
  console.error('❌ Missing Stripe secret key.');
  console.error('Set STRIPE_SECRET_KEY_TEST in your .env');
  process.exit(1);
}

async function testDubAttribution() {
  try {
    console.log('1️⃣ Initializing Stripe client...');
    const stripe = new Stripe(STRIPE_KEY!, {
      apiVersion: '2024-04-10',
    });
    console.log('✅ Stripe client initialized\n');

    // Generate test IDs
    const testTimestamp = Date.now();
    const testCustomerId = `test_customer_${testTimestamp}`;
    const testClickId = `clx123test${testTimestamp}`;

    console.log('2️⃣ Test scenario details:');
    console.log('   Customer ID:', testCustomerId);
    console.log('   Click ID:', testClickId);
    console.log('');

    console.log('3️⃣ Creating test product...');
    const product = await stripe.products.create({
      name: `Dub Test Product ${testTimestamp}`,
      description: 'Test product for Dub attribution',
    });
    console.log('✅ Product created:', product.id, '\n');

    console.log('4️⃣ Creating test price...');
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 4900, // $49.00
      currency: 'usd',
    });
    console.log('✅ Price created:', price.id, '\n');

    console.log('5️⃣ Creating checkout session with Dub metadata...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: price.id,
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/cancel',
      // Option 1: Pass via metadata (recommended for API-based flows)
      metadata: {
        dubCustomerExternalId: testCustomerId,
        dubClickId: testClickId,
        test: 'true',
        testType: 'dub_attribution',
        timestamp: new Date().toISOString(),
      },
      // Option 2: Pass via client_reference_id (for Payment Links)
      client_reference_id: `dub_id_${testClickId}`,
    });

    console.log('✅ Checkout session created with Dub metadata!\n');
    console.log('📋 Session Details:');
    console.log('   Session ID:', session.id);
    console.log('   Amount:', '$' + (session.amount_total! / 100).toFixed(2));
    console.log('   Status:', session.status);
    console.log('');
    console.log('🔍 Dub Metadata:');
    console.log('   dubCustomerExternalId:', session.metadata?.dubCustomerExternalId);
    console.log('   dubClickId:', session.metadata?.dubClickId);
    console.log('   client_reference_id:', session.client_reference_id);
    console.log('');

    console.log('🎉 Session created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 To complete the test purchase:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('1. Open this URL in your browser:');
    console.log('   ' + session.url);
    console.log('');
    console.log('2. Use test card: 4242 4242 4242 4242');
    console.log('   Expiry: Any future date (e.g., 12/34)');
    console.log('   CVC: Any 3 digits (e.g., 123)');
    console.log('');
    console.log('3. After completing the purchase, check:');
    console.log('   a) Your Stripe webhook logs for the checkout.session.completed event');
    console.log('   b) Dub Partner dashboard to see if the sale was attributed');
    console.log('   c) Your webhook endpoint should NOT show the error:');
    console.log('      "No stripeCustomerId or dubCustomerExternalId found"');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('💡 Expected Behavior:');
    console.log('   • Stripe webhook receives checkout.session.completed');
    console.log('   • Dub Stripe app sees dubCustomerExternalId in metadata');
    console.log('   • Dub tracks the sale and attributes it to the click ID');
    console.log('   • No "skipping" error messages in Dub webhook logs');
    console.log('');

    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Test failed:', message);

    if (typeof error === 'object' && error !== null && 'type' in error) {
      const stripeError = error as { type?: string; code?: string };
      if (stripeError.type === 'StripeAuthenticationError') {
        console.error('\n🔑 Authentication Error:');
        console.error('The Stripe secret key is invalid. Check your .env file.');
      }
    }

    return false;
  }
}

testDubAttribution().then((success) => {
  if (success) {
    console.log('✅ Test setup completed successfully');
    process.exit(0);
  } else {
    console.error('❌ Test setup failed');
    process.exit(1);
  }
});
