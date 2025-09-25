#!/bin/bash

# Test Stripe Webhook Processing
# This script simulates a Stripe webhook event to test the purchase flow

echo "🧪 Testing Stripe Webhook Processing..."
echo ""

# Check if webhook secret is configured
if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
  echo "⚠️  STRIPE_WEBHOOK_SECRET not set. Loading from .env..."
  export $(cat .env | grep STRIPE_WEBHOOK_SECRET | xargs)
fi

# Start the dev server in background
echo "📦 Starting development server..."
cd apps/store
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 10

# Test webhook endpoint is accessible
echo "🔍 Testing webhook endpoint..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

echo ""
echo ""

# Instructions for testing with Stripe CLI
echo "📝 To test with real Stripe events:"
echo ""
echo "1. Install Stripe CLI: brew install stripe/stripe-cli/stripe"
echo ""
echo "2. Login to Stripe: stripe login"
echo ""
echo "3. Forward webhooks to local server:"
echo "   stripe listen --forward-to localhost:3000/api/stripe/webhook"
echo ""
echo "4. In another terminal, trigger test events:"
echo "   stripe trigger checkout.session.completed"
echo "   stripe trigger payment_intent.succeeded"
echo ""
echo "5. Check the database for new records:"
echo "   - checkout_sessions table"
echo "   - orders table"
echo "   - webhook_logs table"
echo ""
echo "6. Verify GoHighLevel sync:"
echo "   - Check GHL contacts for new entries"
echo "   - Verify opportunities were created (if configured)"
echo ""

# Keep server running
echo "💡 Server is running. Press Ctrl+C to stop."
wait $SERVER_PID