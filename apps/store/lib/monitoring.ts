import { countPendingCheckoutSessionsOlderThan, getRecentOrderStats } from "@/lib/checkout-store";
import { countErroredWebhookLogsSince, countPendingWebhookLogsOlderThan } from "@/lib/webhook-logs";
import sendOpsAlert from "@/lib/ops-notify";

export type CheckoutMonitorIssue = {
  key: string;
  severity: "warn" | "alert";
  message: string;
};

export type CheckoutMonitorMetrics = {
  pendingCheckoutSessions: number;
  pendingWebhookLogs: number;
  recentErroredWebhookLogs: number;
  recentOrders: number;
  recentOrdersLookbackHours: number;
  lastOrderAt: Date | null;
};

function parseIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const STALE_CHECKOUT_MINUTES = parseIntegerEnv("CHECKOUT_MONITOR_STALE_SESSION_MINUTES", 15);
const STALE_WEBHOOK_MINUTES = parseIntegerEnv("CHECKOUT_MONITOR_STALE_WEBHOOK_MINUTES", 10);
const ERRORED_WEBHOOK_LOOKBACK_HOURS = parseIntegerEnv("CHECKOUT_MONITOR_WEBHOOK_LOOKBACK_HOURS", 6);
const MIN_ORDERS_LOOKBACK_HOURS = parseIntegerEnv("CHECKOUT_MONITOR_MIN_ORDERS_LOOKBACK_HOURS", 24);
const MIN_ORDERS_REQUIRED = parseIntegerEnv("CHECKOUT_MONITOR_MIN_ORDERS", 1);

export async function collectCheckoutMonitorMetrics(): Promise<CheckoutMonitorMetrics> {
  const [pendingSessions, pendingWebhookLogs, erroredWebhookLogs, orderStats] = await Promise.all([
    countPendingCheckoutSessionsOlderThan(STALE_CHECKOUT_MINUTES),
    countPendingWebhookLogsOlderThan(STALE_WEBHOOK_MINUTES),
    countErroredWebhookLogsSince(ERRORED_WEBHOOK_LOOKBACK_HOURS),
    getRecentOrderStats(MIN_ORDERS_LOOKBACK_HOURS),
  ]);

  return {
    pendingCheckoutSessions: pendingSessions,
    pendingWebhookLogs,
    recentErroredWebhookLogs: erroredWebhookLogs,
    recentOrders: orderStats.count,
    recentOrdersLookbackHours: MIN_ORDERS_LOOKBACK_HOURS,
    lastOrderAt: orderStats.lastOrderAt,
  };
}

export async function evaluateCheckoutHealth(): Promise<{
  metrics: CheckoutMonitorMetrics;
  issues: CheckoutMonitorIssue[];
}> {
  const metrics = await collectCheckoutMonitorMetrics();
  const issues: CheckoutMonitorIssue[] = [];

  if (metrics.pendingCheckoutSessions > 0) {
    issues.push({
      key: "pending_checkout_sessions",
      severity: "alert",
      message: `${metrics.pendingCheckoutSessions} checkout session(s) pending for more than ${STALE_CHECKOUT_MINUTES} minutes`,
    });
  }

  if (metrics.pendingWebhookLogs > 0) {
    issues.push({
      key: "pending_webhook_logs",
      severity: "alert",
      message: `${metrics.pendingWebhookLogs} webhook log(s) pending for more than ${STALE_WEBHOOK_MINUTES} minutes`,
    });
  }

  if (metrics.recentErroredWebhookLogs > 0) {
    issues.push({
      key: "errored_webhook_logs",
      severity: "warn",
      message: `${metrics.recentErroredWebhookLogs} webhook log(s) errored in the last ${ERRORED_WEBHOOK_LOOKBACK_HOURS} hour(s)`,
    });
  }

  if (MIN_ORDERS_REQUIRED > 0 && metrics.recentOrders < MIN_ORDERS_REQUIRED) {
    issues.push({
      key: "insufficient_recent_orders",
      severity: "warn",
      message: `Only ${metrics.recentOrders} order(s) in the past ${metrics.recentOrdersLookbackHours} hour(s); expected at least ${MIN_ORDERS_REQUIRED}`,
    });
  }

  return { metrics, issues };
}

export async function sendCheckoutHealthAlert(message: string, context: Record<string, unknown>): Promise<void> {
  await sendOpsAlert(message, context);
}
