import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  // Verify monitoring token
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (token !== process.env.MONITORING_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get hourly sales for last 24 hours
    const hourlySales = await query`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as order_count,
        SUM(amount_total) as revenue,
        AVG(amount_total) as avg_order_value
      FROM orders
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND payment_status = 'completed'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour DESC
    `;

    // Get last hour stats
    const lastHour = await query`
      SELECT 
        COUNT(*) as order_count,
        COALESCE(SUM(amount_total), 0) as revenue,
        MAX(created_at) as last_order_at
      FROM orders
      WHERE created_at > NOW() - INTERVAL '1 hour'
        AND payment_status = 'completed'
    `;

    // Get today's total
    const today = await query`
      SELECT 
        COUNT(*) as order_count,
        COALESCE(SUM(amount_total), 0) as revenue,
        COUNT(DISTINCT customer_email) as unique_customers
      FROM orders
      WHERE created_at::date = CURRENT_DATE
        AND payment_status = 'completed'
    `;

    // Get pending checkouts (people who started but didn't complete)
    const pendingCheckouts = await query`
      SELECT COUNT(*) as count
      FROM checkout_sessions
      WHERE status = 'pending'
        AND created_at > NOW() - INTERVAL '30 minutes'
    `;

    return NextResponse.json({
      lastHour: lastHour?.rows[0] || { order_count: '0', revenue: '0', last_order_at: null },
      today: today?.rows[0] || { order_count: '0', revenue: '0', unique_customers: '0' },
      hourlySales: hourlySales?.rows || [],
      pendingCheckouts: parseInt((pendingCheckouts?.rows || [])[0]?.count || '0'),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sales monitoring error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales metrics' },
      { status: 500 }
    );
  }
}
