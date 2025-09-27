#!/usr/bin/env npx tsx

/**
 * Direct Stripe test to verify credentials are working
 */

import Stripe from 'stripe';

console.log('🧪 Testing Stripe Connection Directly\n');

// Load environment variable
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is not set');
  console.log('Please set it in .env.local file');
  process.exit(1);
}

async function testStripe() {
  try {
    console.log('1️⃣ Initializing Stripe client...');
    const stripe = new Stripe(STRIPE_KEY!, {
      apiVersion: '2024-04-10' as any,
    });

    console.log('✅ Stripe client initialized\n');

    console.log('2️⃣ Creating test product...');
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
  } catch (error: any) {
    console.error('❌ Stripe test failed:', error.message);

    if (error.type === 'StripeAuthenticationError') {
      console.error('\n🔑 Authentication Error:');
      console.error('The Stripe secret key is invalid or not working.');
      console.error('Please check your STRIPE_SECRET_KEY in .env.local');
    } else if (error.type === 'StripeConnectionError') {
      console.error('\n🌐 Connection Error:');
      console.error('Cannot connect to Stripe API.');
      console.error('Check your internet connection.');
    } else if (error.type === 'StripeAPIError') {
      console.error('\n⚠️  API Error:');
      console.error('Stripe API returned an error.');
    }

    return false;
  }
}

// Run the test
testStripe();