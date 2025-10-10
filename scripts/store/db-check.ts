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

async function checkDatabase() {
  console.log("📊 Database Status Check\n");

  const isConfigured = await ensureDatabase();
  if (!isConfigured) {
    console.log("❌ Database not configured");
    process.exit(1);
  }

  // Count records
  const sessionCount = await query<{ count: string }>`SELECT COUNT(*) as count FROM checkout_sessions`;
  const orderCount = await query<{ count: string }>`SELECT COUNT(*) as count FROM orders`;
  const logCount = await query<{ count: string }>`SELECT COUNT(*) as count FROM webhook_logs`;

  console.log("📈 Total Records:");
  console.log(`  - Checkout Sessions: ${sessionCount?.rows?.[0]?.count ?? 0}`);
  console.log(`  - Orders: ${orderCount?.rows?.[0]?.count ?? 0}`);
  console.log(`  - Webhook Logs: ${logCount?.rows?.[0]?.count ?? 0}\n`);

  // Get recent orders
  const recentOrders = await query<{
    offer_id: string;
    customer_email: string;
    amount_total: number;
    created_at: string;
    source: string;
    session_metadata: Record<string, unknown> | null;
  }>`
    SELECT o.offer_id, o.customer_email, o.amount_total, o.created_at, o.source,
           cs.metadata as session_metadata
    FROM orders o
    LEFT JOIN checkout_sessions cs ON o.checkout_session_id = cs.id
    ORDER BY o.created_at DESC
    LIMIT 10
  `;

  if (recentOrders?.rows && recentOrders.rows.length > 0) {
    console.log("📦 Recent Orders:");
    recentOrders.rows.forEach((order) => {
      const amount = order.amount_total ? `$${(order.amount_total / 100).toFixed(2)}` : 'N/A';
      const date = new Date(order.created_at).toLocaleString();
      const ghlSynced = order.session_metadata?.ghlSyncedAt ? '✅' : '❌';
      console.log(`  [${ghlSynced}] ${order.customer_email} - ${amount} - ${order.offer_id} - ${date}`);
    });
  } else {
    console.log("📦 No orders found yet");
  }

  // Check for errors
  const recentErrors = await query<{
    payment_intent_id: string;
    offer_id: string;
    last_error: string;
    attempts: number;
    updated_at: string;
  }>`
    SELECT payment_intent_id, offer_id, last_error, attempts, updated_at
    FROM webhook_logs
    WHERE status = 'error'
    ORDER BY updated_at DESC
    LIMIT 5
  `;

  if (recentErrors?.rows && recentErrors.rows.length > 0) {
    console.log("\n⚠️  Recent Errors:");
    recentErrors.rows.forEach(error => {
      const date = new Date(error.updated_at).toLocaleString();
      console.log(`  - ${error.offer_id} (${error.attempts} attempts) - ${date}`);
      console.log(`    ${error.last_error}`);
    });
  }

  console.log("\n✅ Database check complete");
}

checkDatabase().catch(error => {
  console.error("❌ Check failed:", error);
  process.exit(1);
});
