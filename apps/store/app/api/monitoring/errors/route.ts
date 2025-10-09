import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { sendOpsAlert } from '@/lib/notifications/ops';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (token !== process.env.MONITORING_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check for errors in last hour
    const recentErrors = await query`
      SELECT 
        event_type,
        COUNT(*) as count,
        MAX(updated_at) as last_error,
        last_error
      FROM webhook_logs
      WHERE status = 'error'
        AND updated_at > NOW() - INTERVAL '1 hour'
      GROUP BY event_type, last_error
      ORDER BY count DESC
    `;

    // Check payment failures
    const paymentFailures = await query`
      SELECT COUNT(*) as count
      FROM orders
      WHERE payment_status = 'failed'
        AND created_at > NOW() - INTERVAL '1 hour'
    `;

    // Check GHL sync failures
    const ghlFailures = await query`
      SELECT COUNT(*) as count
      FROM checkout_sessions
      WHERE metadata->>'ghlSyncedAt' IS NULL
        AND created_at > NOW() - INTERVAL '1 hour'
        AND status = 'completed'
    `;

    const errorCount = (recentErrors?.rows || []).reduce((sum, row) => sum + parseInt(row.count), 0);
    const paymentFailureCount = parseInt((paymentFailures?.rows || [])[0]?.count || '0');
    const ghlFailureCount = parseInt((ghlFailures?.rows || [])[0]?.count || '0');

    // Alert if errors exceed threshold
    if (errorCount > 5) {
      await sendOpsAlert('⚠️ High error rate detected', {
        errorCount,
        lastHour: true,
        details: (recentErrors?.rows || []).slice(0, 3),
      });
    }

    if (paymentFailureCount > 3) {
      await sendOpsAlert('💳 Multiple payment failures', {
        count: paymentFailureCount,
        lastHour: true,
      });
    }

    return NextResponse.json({
      errors: {
        total: errorCount,
        byType: recentErrors?.rows || [],
      },
      paymentFailures: paymentFailureCount,
      ghlFailures: ghlFailureCount,
      alertsTriggered: errorCount > 5 || paymentFailureCount > 3,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error monitoring failed:', error);
    return NextResponse.json(
      { error: 'Failed to check errors' },
      { status: 500 }
    );
  }
}
