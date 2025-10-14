import { ensureDatabase, query } from "@/lib/database";

export async function countPendingCheckoutSessionsOlderThan(minutes: number): Promise<number> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return 0;
  }

  const interval = Math.max(Math.floor(minutes), 1);

  const result = await query<{ pending_count: string }>`
    SELECT COUNT(*)::int AS pending_count
      FROM checkout_sessions
     WHERE status = 'pending'
       AND created_at < NOW() - (${interval}::int * INTERVAL '1 minute');
  `;

  const value = result?.rows?.[0]?.pending_count;
  return typeof value === "number" ? value : Number.parseInt(String(value ?? 0), 10) || 0;
}

export async function getRecentOrderStats(hours: number): Promise<{
  count: number;
  lastOrderAt: Date | null;
}> {
  const schemaReady = await ensureDatabase();

  if (!schemaReady) {
    return { count: 0, lastOrderAt: null };
  }

  const interval = Math.max(Math.floor(hours), 1);

  const result = await query<{ order_count: string; last_created_at: string | null }>`
    SELECT COUNT(*)::int AS order_count,
           MAX(created_at) AS last_created_at
      FROM orders
     WHERE created_at >= NOW() - (${interval}::int * INTERVAL '1 hour');
  `;

  const row = result?.rows?.[0];
  const countValue = row?.order_count;
  const count = typeof countValue === "number" ? countValue : Number.parseInt(String(countValue ?? 0), 10) || 0;
  const lastOrderAt = row?.last_created_at ? new Date(row.last_created_at) : null;

  return { count, lastOrderAt };
}
