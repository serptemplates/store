import * as fs from "fs";
import { config } from "dotenv";
import * as path from "path";
import { ensureDatabase, query } from "../../apps/store/lib/database";

function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
    path.resolve(process.cwd(), "../../.env"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      config({ path: candidate });
      return;
    }
  }

  config();
}

loadEnv();

async function checkWebhookError() {
  const isConfigured = await ensureDatabase();
  if (!isConfigured) {
    console.log("❌ Database not configured");
    return;
  }

  // Get the most recent webhook error
  const result = await query<{
    payment_intent_id: string;
    event_type: string;
    offer_id: string;
    status: string;
    last_error: string;
    metadata: any;
    updated_at: string;
  }>`
    SELECT payment_intent_id, event_type, offer_id, status, last_error, metadata, updated_at
    FROM webhook_logs
    WHERE status = 'error'
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  if (result?.rows && result.rows.length > 0) {
    const error = result.rows[0];
    console.log("📊 Most Recent Webhook Error:\n");
    console.log(`Offer: ${error.offer_id}`);
    console.log(`Event: ${error.event_type}`);
    console.log(`Time: ${new Date(error.updated_at).toLocaleString()}`);
    console.log(`\nError Message:`);
    console.log(error.last_error);

    if (error.metadata) {
      console.log(`\nMetadata:`);
      console.log(JSON.stringify(error.metadata, null, 2));
    }
  } else {
    console.log("No webhook errors found");
  }

  // Also check the checkout session metadata for GHL sync errors
  const sessionResult = await query<{
    stripe_session_id: string;
    metadata: any;
    updated_at: string;
  }>`
    SELECT stripe_session_id, metadata, updated_at
    FROM checkout_sessions
    WHERE customer_email = 'test.customer@example.com'
      AND metadata::text LIKE '%ghlSyncError%'
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  if (sessionResult?.rows && sessionResult.rows.length > 0) {
    const session = sessionResult.rows[0];
    console.log("\n📊 Checkout Session GHL Sync Error:\n");
    console.log(`Session ID: ${session.stripe_session_id}`);
    console.log(`GHL Sync Error: ${session.metadata?.ghlSyncError}`);
    console.log(`Full Metadata:`);
    console.log(JSON.stringify(session.metadata, null, 2));
  }
}

checkWebhookError().catch(console.error);
