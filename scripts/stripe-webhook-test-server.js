#!/usr/bin/env node
/**
 * Simple local Stripe webhook test server.
 *
 * Loads environment variables from `.env` only.
 * Expects the following vars:
 *   STRIPE_SECRET_KEY_TEST or STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET_TEST or STRIPE_WEBHOOK_SECRET
 *
 * Run with `pnpm dev:stripe-webhook` and connect Stripe CLI:
 *   stripe listen --forward-to localhost:4242/webhook
 */

const path = require('path');
const http = require('http');
const dotenv = require('dotenv');
const Stripe = require('stripe');

// Load env file (single source of truth)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const port = Number(process.env.STRIPE_WEBHOOK_PORT || 4242);
const stripeSecretKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  console.error('Missing STRIPE_SECRET_KEY_TEST or STRIPE_SECRET_KEY. Set it in your .env file.');
  process.exit(1);
}

if (!webhookSecret) {
  console.warn('Warning: missing STRIPE_WEBHOOK_SECRET_TEST/STRIPE_WEBHOOK_SECRET. Events will not be verified.');
}

const stripe = new Stripe(stripeSecretKey);

function sendJSON(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url && req.url.startsWith('/webhook')) {
    const chunks = [];

    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks);
      const signature = req.headers['stripe-signature'];

      let event;
      try {
        if (!webhookSecret) {
          throw new Error('Webhook secret not configured');
        }
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err) {
        console.error('⚠️  Webhook signature verification failed.', err.message);
        return sendJSON(res, 400, { error: err.message });
      }

      console.log(`⬇️  Received event ${event.type} (${event.id})`);

      switch (event.type) {
        case 'checkout.session.completed':
          console.log('✅ Checkout session completed. Payment intent:', event.data.object.payment_intent);
          break;
        case 'payment_intent.succeeded':
          console.log('💸 Payment intent succeeded:', event.data.object.id);
          break;
        case 'payment_intent.payment_failed':
          console.log('❌ Payment failed:', event.data.object.id);
          break;
        default:
          console.log('ℹ️  Unhandled event type:', event.type);
      }

      return sendJSON(res, 200, { received: true });
    });
    req.on('error', (err) => {
      console.error('Request error', err);
      sendJSON(res, 500, { error: 'Request stream error' });
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    return sendJSON(res, 200, { status: 'ok' });
  }

  sendJSON(res, 404, { error: 'Not found' });
});

server.listen(port, () => {
  console.log(`
🚀 Stripe webhook test server listening on http://localhost:${port}
Use: stripe listen --forward-to localhost:${port}/webhook
`);
  if (!webhookSecret) {
    console.log('⚠️  Set STRIPE_WEBHOOK_SECRET_TEST to verify events.');
  }
});
