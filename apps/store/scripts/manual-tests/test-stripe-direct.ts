#!/usr/bin/env npx tsx

/**
 * Direct Stripe test to verify credentials are working
 */

import fs from 'node:fs';
import path from 'node:path';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables from common locations so running from apps/store works
const HERE = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(new URL(import.meta.url).pathname);

function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.resolve(dir);
    if (fs.existsSync(path.join(candidate, 'pnpm-workspace.yaml')) || fs.existsSync(path.join(candidate, 'package.json'))) {
      // Heuristic: workspace root has pnpm-workspace.yaml
      if (fs.existsSync(path.join(candidate, 'pnpm-workspace.yaml'))) {
        return candidate;
      }
      // Fallback: top-most package.json with workspaces
      try {
        const pkgJson = JSON.parse(fs.readFileSync(path.join(candidate, 'package.json'), 'utf8'));
        if (pkgJson?.private && (pkgJson?.workspaces || pkgJson?.packageManager)) {
          return candidate;
        }
      } catch {
        // ignore
      }
    }
    const parent = path.dirname(candidate);
    if (parent === candidate) break;
    dir = parent;
  }
  // Fallback to 4-levels up from apps/store/scripts/manual-tests
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

console.log('🧪 Testing Stripe Connection Directly\n');

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function resolveStripeModeFromEnv(): 'test' | 'live' {
  const explicit = process.env.STRIPE_MODE || process.env.NEXT_PUBLIC_STRIPE_MODE;
  if (isNonEmptyString(explicit)) {
    const n = explicit.trim().toLowerCase();
    if (n === 'live' || n === 'prod' || n === 'production') return 'live';
    return 'test';
  }
  // Prefer test if we have any test key configured
  if (isNonEmptyString(process.env.STRIPE_SECRET_KEY_TEST)) return 'test';
  if (isNonEmptyString(process.env.STRIPE_TEST_SECRET_KEY)) return 'test';
  if (isNonEmptyString(process.env.STRIPE_SECRET_KEY) && process.env.STRIPE_SECRET_KEY!.startsWith('sk_test_')) return 'test';
  // Otherwise fall back to live if present
  if (isNonEmptyString(process.env.STRIPE_SECRET_KEY_LIVE)) return 'live';
  if (isNonEmptyString(process.env.STRIPE_SECRET_KEY) && process.env.STRIPE_SECRET_KEY!.startsWith('sk_live_')) return 'live';
  // Default to test
  return 'test';
}

function resolveStripeSecret(mode: 'test' | 'live'): string | undefined {
  if (mode === 'test') {
    return (
      process.env.STRIPE_SECRET_KEY_TEST ||
      process.env.STRIPE_TEST_SECRET_KEY ||
      (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? process.env.STRIPE_SECRET_KEY : undefined)
    );
  }
  return (
    process.env.STRIPE_SECRET_KEY_LIVE ||
    (process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? process.env.STRIPE_SECRET_KEY : undefined)
  );
}

const ACTIVE_MODE = resolveStripeModeFromEnv();
const STRIPE_KEY = resolveStripeSecret(ACTIVE_MODE);
if (!isNonEmptyString(STRIPE_KEY)) {
  console.error('❌ Missing Stripe secret key.');
  if (ACTIVE_MODE === 'test') {
    console.error('Set STRIPE_SECRET_KEY_TEST (or STRIPE_SECRET_KEY with an sk_test_* value) in your .env');
  } else {
    console.error('Set STRIPE_SECRET_KEY_LIVE (or STRIPE_SECRET_KEY with an sk_live_* value) in your .env');
  }
  process.exit(1);
}

async function testStripe() {
  try {
    console.log('1️⃣ Initializing Stripe client...');
    const stripeApiVersion = '2024-04-10' as Stripe.LatestApiVersion;
    const stripe = new Stripe(STRIPE_KEY!, {
      apiVersion: stripeApiVersion,
    });

    console.log('✅ Stripe client initialized\n');

    console.log(`2️⃣ Creating test product using ${ACTIVE_MODE.toUpperCase()} credentials...`);
    const product = await stripe.products.create({
      name: 'Test Product ' + Date.now(),
      description: 'Automated test product',
    });
    console.log('✅ Product created:', product.id, '\n');

    console.log('3️⃣ Creating test price...');
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 7900, // $79.00
      currency: 'usd',
    });
    console.log('✅ Price created:', price.id, '\n');

    console.log('4️⃣ Creating checkout session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: price.id,
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'http://localhost:3000/checkout/success',
      cancel_url: 'http://localhost:3000/cancel',
      metadata: {
        test: 'true',
        timestamp: new Date().toISOString(),
        // Demonstrate Dub integration: associate this Stripe session to a user in your DB
        // Replace with a real user ID when testing end-to-end
        dubCustomerId: process.env.DUB_TEST_CUSTOMER_ID || 'user_123',
      },
    });

    console.log('✅ Checkout session created successfully!');
    console.log('   Session ID:', session.id);
    console.log('   Amount:', '$' + (session.amount_total! / 100).toFixed(2));
    console.log('   URL:', session.url?.substring(0, 60) + '...');
    console.log('   Status:', session.status);
    console.log('\n🎉 Stripe is working correctly!\n');

    console.log('📝 To complete a test purchase:');
    console.log('1. Open this URL:', session.url);
    console.log('2. Use test card: 4242 4242 4242 4242');
    console.log('3. Any future expiry date and any CVC');

    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Stripe test failed:', message);

    if (typeof error === 'object' && error !== null && 'type' in error && (error as { type?: unknown }).type === 'StripeAuthenticationError') {
      console.error('\n🔑 Authentication Error:');
      console.error('The Stripe secret key is invalid or not working.');
      console.error('Please verify your configured Stripe secret key value.');
    } else if (typeof error === 'object' && error !== null && 'type' in error && (error as { type?: unknown }).type === 'StripeConnectionError') {
      console.error('\n🌐 Connection Error:');
      console.error('Cannot connect to Stripe API.');
      console.error('Check your internet connection.');
    } else if (typeof error === 'object' && error !== null && 'type' in error && (error as { type?: unknown }).type === 'StripeAPIError') {
      console.error('\n⚠️  API Error:');
      console.error('Stripe API returned an error.');
    }

    return false;
  }
}

// Run the test
testStripe();
