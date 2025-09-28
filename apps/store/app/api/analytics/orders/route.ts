import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { query, ensureDatabase } from "../../../../lib/database";

export const runtime = "nodejs";

// Simple auth check - in production, this should use proper authentication
function isAuthorized(request: NextRequest): boolean {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const expectedToken = process.env.MONITORING_TOKEN;
  return expectedToken ? token === expectedToken : true; // Allow if no token set
}

interface OrderSummary {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  orders_today: number;
  orders_this_week: number;
  top_products: Array<{
    offer_id: string;
    count: number;
    revenue: number;
  }>;
  payment_methods: Array<{
    method: string;
    count: number;
    revenue: number;
  }>;
  recent_orders: Array<{
    id: string;
    customer_email: string;
    amount_total: number;
    currency: string;
    offer_id: string;
    payment_status: string;
    created_at: string;
  }>;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schemaReady = await ensureDatabase();
  if (!schemaReady) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  try {
    // Get overall statistics
    const overallStats = await query`
      SELECT 
        COUNT(*)::int as total_orders,
        COALESCE(SUM(amount_total), 0)::bigint as total_revenue,
        COALESCE(AVG(amount_total), 0)::numeric as avg_order_value
      FROM orders 
      WHERE payment_status = 'succeeded'
    `;

    // Get today's orders
    const todayStats = await query`
      SELECT COUNT(*)::int as orders_today
      FROM orders 
      WHERE payment_status = 'succeeded' 
        AND created_at >= CURRENT_DATE
    `;

    // Get this week's orders
    const weekStats = await query`
      SELECT COUNT(*)::int as orders_this_week
      FROM orders 
      WHERE payment_status = 'succeeded' 
        AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    `;

    // Get top products by order count
    const topProducts = await query`
      SELECT 
        offer_id,
        COUNT(*)::int as count,
        COALESCE(SUM(amount_total), 0)::bigint as revenue
      FROM orders 
      WHERE payment_status = 'succeeded' 
        AND offer_id IS NOT NULL
      GROUP BY offer_id
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get payment method breakdown
    const paymentMethods = await query`
      SELECT 
        COALESCE(payment_method, 'unknown') as method,
        COUNT(*)::int as count,
        COALESCE(SUM(amount_total), 0)::bigint as revenue
      FROM orders 
      WHERE payment_status = 'succeeded'
      GROUP BY payment_method
      ORDER BY count DESC
    `;

    // Get recent orders
    const recentOrders = await query`
      SELECT 
        id,
        customer_email,
        amount_total,
        currency,
        offer_id,
        payment_status,
        created_at
      FROM orders 
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const summary: OrderSummary = {
      total_orders: overallStats.rows[0]?.total_orders || 0,
      total_revenue: Number(overallStats.rows[0]?.total_revenue || 0) / 100, // Convert cents to dollars
      avg_order_value: Number(overallStats.rows[0]?.avg_order_value || 0) / 100,
      orders_today: todayStats.rows[0]?.orders_today || 0,
      orders_this_week: weekStats.rows[0]?.orders_this_week || 0,
      top_products: topProducts.rows.map(row => ({
        offer_id: row.offer_id,
        count: row.count,
        revenue: Number(row.revenue) / 100
      })),
      payment_methods: paymentMethods.rows.map(row => ({
        method: row.method,
        count: row.count,
        revenue: Number(row.revenue) / 100
      })),
      recent_orders: recentOrders.rows.map(row => ({
        id: row.id,
        customer_email: row.customer_email,
        amount_total: Number(row.amount_total || 0) / 100,
        currency: row.currency || 'USD',
        offer_id: row.offer_id,
        payment_status: row.payment_status,
        created_at: row.created_at
      }))
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Analytics query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}