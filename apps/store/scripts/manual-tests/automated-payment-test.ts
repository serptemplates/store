#!/usr/bin/env npx tsx

/**
 * Automated Payment Link Validation
 *
 * This script verifies that:
 *   1. Live products have usable Payment Links configured.
 *   2. Database, webhooks, and GHL syncs are healthy.
 *
 * Run with: npx tsx scripts/manual-tests/automated-payment-test.ts
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

import { query } from "../../lib/database";

type PaymentLinkTestDetails = {
  totalLiveProducts: number;
  missingPaymentLinks: string[];
};

type GenericTestDetails = Record<string, unknown>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storeDir = path.resolve(__dirname, "..", "..");
const productsDir = path.join(storeDir, "data", "products");

console.log("🤖 Automated Checkout Validation\n");

// ANSI helpers (kept minimal so the script still reads well without colors)
const green = "\x1b[32m";
const red = "\x1b[31m";
const yellow = "\x1b[33m";
const reset = "\x1b[0m";

const log = {
  success: (msg: string) => console.log(`${green}✅ ${msg}${reset}`),
  error: (msg: string) => console.log(`${red}❌ ${msg}${reset}`),
  warning: (msg: string) => console.log(`${yellow}⚠️  ${msg}${reset}`),
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
};

const testResults: {
  paymentLinks: { passed: boolean; details: PaymentLinkTestDetails };
  database: { passed: boolean; details: GenericTestDetails };
  ghl: { passed: boolean; details: GenericTestDetails };
  webhooks: { passed: boolean; details: GenericTestDetails };
} = {
  paymentLinks: { passed: false, details: { totalLiveProducts: 0, missingPaymentLinks: [] } },
  database: { passed: false, details: {} },
  ghl: { passed: false, details: {} },
  webhooks: { passed: false, details: {} },
};

async function testPaymentLinkConfiguration() {
  console.log("\n🔗 PAYMENT LINK CONFIGURATION CHECK\n");

  const productFiles = readdirSync(productsDir).filter((file) => /\.ya?ml$/i.test(file));
  const missing: string[] = [];
  let liveProductCount = 0;

  for (const file of productFiles) {
    const raw = readFileSync(path.join(productsDir, file), "utf8");
    const data = parse(raw) as {
      slug?: string;
      status?: string;
      payment_link?: Record<string, string> | null;
      buy_button_destination?: string | null;
    } | null;

    if (!data) continue;

    const status = (data.status ?? "draft").toLowerCase();
    if (status !== "live") continue;

    liveProductCount += 1;
    const slug = data.slug ?? file.replace(/\.ya?ml$/i, "");

    const paymentLink = data.payment_link ?? null;
    const hasStripeLink =
      !!paymentLink
      && typeof paymentLink === "object"
      && (typeof paymentLink.live_url === "string" || typeof paymentLink.test_url === "string");
    const hasGhlLink =
      !!paymentLink && typeof paymentLink === "object" && typeof paymentLink.ghl_url === "string";

    if (!hasStripeLink && !hasGhlLink) {
      missing.push(slug);
    }
  }

  testResults.paymentLinks.details = {
    totalLiveProducts: liveProductCount,
    missingPaymentLinks: missing,
  };

  if (missing.length === 0) {
    log.success(`All ${liveProductCount} live products have Payment Links configured.`);
    testResults.paymentLinks.passed = true;
  } else {
    log.warning(
      `Found ${missing.length} live product(s) missing Payment Links: ${missing.join(", ")}`,
    );
    log.info("Add `payment_link` entries to the product YAML before shipping.");
  }
}

async function testDatabaseAndWebhooks() {
  console.log("\n💾 DATABASE & WEBHOOK HEALTH CHECK\n");

  try {
    const dbResult = await query<{ time: string; version: string }>`
      SELECT NOW() as time, version() as version;
    `;

    if (dbResult?.rowCount) {
      const version = dbResult.rows[0]?.version?.split(" ")?.[1] ?? "unknown";
      log.success(`Database reachable (PostgreSQL ${version}).`);
      testResults.database.passed = true;
    }

    const webhookStats = await query<{
      event_type: string;
      status: string;
      count: number;
    }>`
      SELECT event_type, status, COUNT(*) as count
        FROM webhook_logs
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY event_type, status
       ORDER BY count DESC;
    `;

    if (webhookStats?.rowCount) {
      log.success("Recent webhook activity detected:");
      webhookStats.rows.forEach((row) => {
        const icon = row.status === "success" ? "✅" : "❌";
        console.log(`  ${icon} ${row.event_type}: ${row.count} (${row.status})`);
      });
      testResults.webhooks.passed = true;
    } else {
      log.warning("No webhook events recorded in the past 24 hours.");
    }

    const ghlStats = await query<{
      total_orders: number;
      synced: number;
      failed: number;
    }>`
      SELECT
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE metadata->>'ghlSyncedAt' IS NOT NULL) as synced,
        COUNT(*) FILTER (WHERE metadata->>'ghlError' IS NOT NULL) as failed
        FROM checkout_sessions
       WHERE created_at > NOW() - INTERVAL '7 days';
    `;

    if (ghlStats?.rowCount && ghlStats.rows[0]?.total_orders > 0) {
      const { total_orders, synced, failed } = ghlStats.rows[0];
      const syncRate = total_orders ? ((synced / total_orders) * 100).toFixed(1) : "0.0";
      log.info(`GHL sync rate (7d): ${syncRate}% (${synced}/${total_orders}). Failed: ${failed}.`);
      testResults.ghl.passed = synced > 0;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`Database/Webhook check failed: ${message}`);
  }
}

async function runAllTests() {
  console.log("Starting automated checks...\n");

  try {
    const health = await fetch("http://localhost:3000/api/health");
    if (!health.ok) {
      throw new Error("Server responded with an error.");
    }
  } catch {
    log.error("Server is not running. Start it with `pnpm dev` before running this script.");
    process.exit(1);
  }

  await testPaymentLinkConfiguration();
  await testDatabaseAndWebhooks();

  console.log("\n" + "=".repeat(60));
  console.log("📊 AUTOMATED CHECK REPORT\n");

  let totalPassed = 0;
  let total = 0;

  for (const [name, result] of Object.entries(testResults)) {
    total += 1;
    if (result.passed) totalPassed += 1;

    const status = result.passed ? "PASSED" : "FAILED";
    console.log(`${status === "PASSED" ? "✅" : "❌"} ${name.toUpperCase()}: ${status}`);
    if (result.details && Object.keys(result.details).length > 0) {
      Object.entries(result.details).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          return;
        }
        console.log(`  • ${key}: ${Array.isArray(value) ? value.join(", ") : value}`);
      });
    }
    if ("error" in result.details && result.details.error) {
      log.error(`  ↳ ${result.details.error}`);
    }
  }

  console.log(`\n📈 Overall: ${totalPassed}/${total} checks passed`);

  if (totalPassed === total) {
    log.success("All automated checks passed! Run a manual Payment Link purchase to double-check UX.");
  } else {
    log.warning("Some checks failed. Review the output above before releasing.");
  }

  console.log("\nNext steps:");
  console.log("1. Manually open a Payment Link from the product page and purchase with Stripe test mode.");
  console.log("2. Confirm webhook processing finishes (orders + GHL contact updates).");
  console.log("3. Rerun this script after fixes to verify the system is healthy.");
}

runAllTests().catch((error) => {
  log.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
