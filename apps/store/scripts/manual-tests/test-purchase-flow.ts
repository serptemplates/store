/**
 * Run with: npx tsx scripts/manual-tests/test-purchase-flow.ts
 */

import { config } from "dotenv";
import crypto from "crypto";
import Stripe from "stripe";

import { getOptionalStripeWebhookSecret } from "../../lib/stripe-environment";

// Load environment variables
config({ path: "../../../.env.local" });
config({ path: "../../../.env" });

const WEBHOOK_SECRET = getOptionalStripeWebhookSecret("test") || getOptionalStripeWebhookSecret();
const API_URL = process.env.NEXT_PUBLIC_CHECKOUT_URL || "http://localhost:3000";

if (!WEBHOOK_SECRET) {
  console.error("❌ Stripe webhook secret for test mode is not configured (set STRIPE_WEBHOOK_SECRET_TEST)");
  process.exit(1);
}

// Create a mock Stripe checkout.session.completed event
function createMockCheckoutSession(): Stripe.Checkout.Session {
  const sessionId = `cs_test_${crypto.randomBytes(16).toString("hex")}`;
  const paymentIntentId = `pi_test_${crypto.randomBytes(16).toString("hex")}`;

  return {
    id: sessionId,
    object: "checkout.session",
    payment_intent: paymentIntentId,
    payment_status: "paid",
    status: "complete",
    mode: "payment",
    success_url: "https://store.serp.co/products/test-product?checkout=success",
    cancel_url: "https://store.serp.co/products/test-product",
    amount_total: 9900, // $99.00
    amount_subtotal: 9900,
    currency: "usd",
    customer_email: "test.customer@example.com",
    customer_details: {
      email: "test.customer@example.com",
      name: "Test Customer",
      phone: "+1234567890",
      address: null,
      tax_exempt: "none",
      tax_ids: []
    },
    metadata: {
      offerId: "linkedin-learning-downloader",
      productSlug: "linkedin-learning-downloader",
      productName: "LinkedIn Learning Downloader",
      landerId: "linkedin-learning-downloader",
      affiliateId: "test-affiliate-123",
      source: "test-script"
    },
    payment_method_types: ["card"],
    client_reference_id: null,
    created: Math.floor(Date.now() / 1000),
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    livemode: false,
    locale: null,
    billing_address_collection: null,
    shipping_address_collection: null,
    submit_type: null,
    phone_number_collection: { enabled: false },
    recovered_from: null,
    after_expiration: null,
    allow_promotion_codes: null,
    consent: null,
    consent_collection: null,
    custom_fields: [],
    custom_text: {
      shipping_address: null,
      submit: null,
      terms_of_service_acceptance: null,
      after_submit: null
    },
    customer_creation: null,
    invoice: null,
    invoice_creation: null,
    payment_link: null,
    payment_method_collection: null,
    payment_method_options: null,
    setup_intent: null,
    shipping_cost: null,
    shipping_details: null,
    shipping_options: [],
    subscription: null,
    total_details: {
      amount_discount: 0,
      amount_shipping: 0,
      amount_tax: 0
    },
    url: null,
    line_items: {
      object: "list",
      data: [],
      has_more: false,
      url: ""
    },
    automatic_tax: {
      enabled: false,
      status: null
    },
    customer: null,
    shipping: null,
    shipping_rate: null,
    tax_id_collection: { enabled: false }
  } as unknown as Stripe.Checkout.Session;
}

// Create and sign a webhook event
function createSignedWebhookPayload(eventData: any): { payload: string; signature: string } {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify(eventData);

  // Create the signed payload string
  const signedPayload = `${timestamp}.${payload}`;

  // Generate signature
  const signature = crypto
    .createHmac("sha256", WEBHOOK_SECRET!)
    .update(signedPayload)
    .digest("hex");

  // Create Stripe signature header format
  const signatureHeader = `t=${timestamp},v1=${signature}`;

  return {
    payload,
    signature: signatureHeader
  };
}

async function testPurchaseFlow() {
  console.log("🧪 Testing Complete Purchase Flow\n");
  console.log("📝 Test Details:");
  console.log("  - Product: LinkedIn Learning Downloader");
  console.log("  - Customer: test.customer@example.com");
  console.log("  - Amount: $99.00");
  console.log("  - Affiliate: test-affiliate-123\n");

  // Create mock checkout session
  const session = createMockCheckoutSession();

  // Create Stripe event
  const event = {
    id: `evt_test_${crypto.randomBytes(16).toString("hex")}`,
    object: "event",
    api_version: "2023-10-16",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: session
    },
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: null,
      idempotency_key: null
    },
    type: "checkout.session.completed"
  };

  // Sign the webhook payload
  const { payload, signature } = createSignedWebhookPayload(event);

  console.log("📤 Sending webhook event to: http://localhost:3000/api/stripe/webhook\n");

  try {
    // Send webhook to local server
    const response = await fetch("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": signature
      },
      body: payload
    });

    const responseText = await response.text();

    if (response.ok) {
      console.log("✅ Webhook processed successfully!");
      console.log(`   Response: ${responseText}\n`);

      console.log("🔍 Expected Results:");
      console.log("  1. ✓ New record in 'checkout_sessions' table");
      console.log("  2. ✓ New record in 'orders' table");
      console.log("  3. ✓ New record in 'webhook_logs' table");
      console.log("  4. ✓ Contact created in GoHighLevel");
      console.log("  5. ✓ Opportunity created in GHL (if pipeline configured)");
      console.log("  6. ✓ Affiliate ID tracked in GHL custom field\n");

      console.log("📊 To verify results:");
      console.log("  1. Check database: npm run db:check");
      console.log("  2. Check GHL contacts for: test.customer@example.com");
      console.log("  3. Look for affiliate_id field = 'test-affiliate-123'");

    } else {
      console.error(`❌ Webhook failed with status ${response.status}`);
      console.error(`   Response: ${responseText}`);

      if (response.status === 400) {
        console.log("\n⚠️  Possible issues:");
        console.log("  - STRIPE_WEBHOOK_SECRET might not match");
        console.log("  - Server might not be running");
      }
    }
  } catch (error) {
    console.error("❌ Failed to send webhook:", error);
    console.log("\n⚠️  Make sure the development server is running:");
    console.log("    cd apps/store && npm run dev");
  }
}

// Add a database check function
async function checkDatabase() {
  console.log("\n📊 Checking database for results...\n");

  try {
    const { ensureDatabase, query } = await import("../../lib/database");

    const isConfigured = await ensureDatabase();
    if (!isConfigured) {
      console.log("❌ Database not configured");
      return;
    }

    // Check for recent orders
    const recentOrder = await query<{
      offer_id: string;
      customer_email: string;
      amount_total: number;
      metadata: any;
    }>`
      SELECT offer_id, customer_email, amount_total, metadata
      FROM orders
      WHERE customer_email = 'test.customer@example.com'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (recentOrder?.rows && recentOrder.rows.length > 0) {
      const order = recentOrder.rows[0];
      console.log("✅ Order found in database!");
      console.log(`   - Product: ${order.offer_id}`);
      console.log(`   - Customer: ${order.customer_email}`);
      console.log(`   - Amount: $${(order.amount_total / 100).toFixed(2)}`);
      console.log(`   - Affiliate: ${order.metadata?.affiliateId || 'Not set'}`);

      // Check GHL sync status
      const sessionCheck = await query<{
        metadata: any;
      }>`
        SELECT metadata
        FROM checkout_sessions
        WHERE customer_email = 'test.customer@example.com'
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (sessionCheck?.rows && sessionCheck.rows.length > 0) {
        const session = sessionCheck.rows[0];
        if (session.metadata?.ghlSyncedAt) {
          console.log(`\n✅ GoHighLevel sync completed at: ${session.metadata.ghlSyncedAt}`);
          if (session.metadata?.ghlContactId) {
            console.log(`   Contact ID: ${session.metadata.ghlContactId}`);
          }
        } else if (session.metadata?.ghlSyncError) {
          console.log(`\n❌ GoHighLevel sync failed: ${session.metadata.ghlSyncError}`);
        } else {
          console.log("\n⏳ GoHighLevel sync pending or skipped");
        }
      }
    } else {
      console.log("⏳ No order found yet. The webhook might still be processing.");
    }
  } catch (error) {
    console.error("Failed to check database:", error);
  }
}

// Run the test
console.log("🚀 Starting Purchase Flow Test\n");
console.log("⚠️  Make sure the dev server is running: npm run dev\n");

testPurchaseFlow().then(async () => {
  // Wait a bit for processing
  console.log("\n⏳ Waiting 3 seconds for processing...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check database
  await checkDatabase();
}).catch(error => {
  console.error("Test failed:", error);
  process.exit(1);
});
