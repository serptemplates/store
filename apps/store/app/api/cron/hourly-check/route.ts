import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { sendHourlySummary } from '@/lib/sales-notify';
import { sendOpsAlert } from '@/lib/ops-notify';

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel cron jobs send this header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get last hour stats
    const lastHour = await query`
      SELECT 
        COUNT(*) as order_count,
        COALESCE(SUM(amount_total), 0) as revenue
      FROM orders
      WHERE created_at > NOW() - INTERVAL '1 hour'
        AND payment_status = 'completed'
    `;

    // Get today stats
    const today = await query`
      SELECT 
        COUNT(*) as order_count,
        COALESCE(SUM(amount_total), 0) as revenue
      FROM orders
      WHERE created_at::date = CURRENT_DATE
        AND payment_status = 'completed'
    `;

    const hourlyStats = {
      ordersLastHour: parseInt((lastHour?.rows || [])[0]?.order_count || '0'),
      revenueLastHour: parseInt((lastHour?.rows || [])[0]?.revenue || '0'),
      ordersToday: parseInt((today?.rows || [])[0]?.order_count || '0'),
      revenueToday: parseInt((today?.rows || [])[0]?.revenue || '0'),
    };

    // Send hourly summary
    await sendHourlySummary(hourlyStats);

    // Alert if no sales in last 2 hours during business hours (9 AM - 9 PM)
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 21 && hourlyStats.ordersLastHour === 0) {
      const lastTwoHours = await query`
        SELECT COUNT(*) as count
        FROM orders
        WHERE created_at > NOW() - INTERVAL '2 hours'
          AND payment_status = 'completed'
      `;

      if (parseInt((lastTwoHours?.rows || [])[0]?.count || '0') === 0) {
        await sendOpsAlert('🚨 No sales in 2 hours during business hours', {
          currentHour: hour,
          lastOrderCheck: '2 hours ago',
        });
      }
    }

    return NextResponse.json({
      success: true,
      stats: hourlyStats,
    });
  } catch (error) {
    console.error('Hourly check failed:', error);
    await sendOpsAlert('❌ Hourly health check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}
