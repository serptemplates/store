# Real-Time Monitoring & Alerting Guide

## Overview

This guide covers exactly what monitoring and alerting you need to track sales as they happen, catch errors immediately, and react quickly throughout the day.

---

## 🎯 Essential Monitoring Setup

### 1. Real-Time Sales Dashboard (Vercel Analytics + Custom)

**What to Track:**
- Orders per hour
- Revenue per hour
- Current conversion rate
- Active checkout sessions
- Last order timestamp

**Implementation:**

```typescript
// app/api/monitoring/sales/route.ts
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
        SUM(amount_total) as revenue,
        MAX(created_at) as last_order_at
      FROM orders
      WHERE created_at > NOW() - INTERVAL '1 hour'
        AND payment_status = 'completed'
    `;

    // Get today's total
    const today = await query`
      SELECT 
        COUNT(*) as order_count,
        SUM(amount_total) as revenue,
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
      lastHour: lastHour.rows[0],
      today: today.rows[0],
      hourlySales: hourlySales.rows,
      pendingCheckouts: pendingCheckouts.rows[0].count,
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
```

**Access the Dashboard:**
```bash
# From your terminal or monitoring tool
curl -H "Authorization: Bearer YOUR_MONITORING_TOKEN" \
  https://your-domain.com/api/monitoring/sales
```

---

### 2. Slack Real-Time Alerts

**Setup Slack Webhook (Already configured):**
Your `SLACK_ALERT_WEBHOOK_URL` is already in place. Now let's enhance it for real-time sales notifications.

**Create Enhanced Notification Function:**

```typescript
// lib/sales-notify.ts
import logger from './logger';

const SLACK_WEBHOOK_URL = process.env.SLACK_ALERT_WEBHOOK_URL;
const SALES_CHANNEL_URL = process.env.SLACK_SALES_WEBHOOK_URL || SLACK_WEBHOOK_URL;

export async function notifyNewSale(orderData: {
  orderId: string;
  customerEmail: string;
  productName: string;
  amount: number;
  affiliateId?: string;
}) {
  if (!SALES_CHANNEL_URL) {
    logger.debug('sales.notification_skipped', { reason: 'webhook_url_missing' });
    return;
  }

  const message = {
    text: `💰 New Sale: $${(orderData.amount / 100).toFixed(2)}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '💰 New Sale!',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Product:*\n${orderData.productName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Amount:*\n$${(orderData.amount / 100).toFixed(2)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Order ID:*\n${orderData.orderId}`,
          },
          {
            type: 'mrkdwn',
            text: `*Customer:*\n${orderData.customerEmail.substring(0, 3)}***`,
          },
        ],
      },
      ...(orderData.affiliateId
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🎯 *Affiliate:* ${orderData.affiliateId}`,
              },
            },
          ]
        : []),
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `⏰ ${new Date().toLocaleString()}`,
          },
        ],
      },
    ],
  };

  try {
    await fetch(SALES_CHANNEL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    logger.info('sales.notification_sent', { orderId: orderData.orderId });
  } catch (error) {
    logger.error('sales.notification_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function notifyPaymentFailure(data: {
  customerEmail: string;
  productName: string;
  amount: number;
  reason?: string;
}) {
  if (!SLACK_WEBHOOK_URL) return;

  const message = {
    text: `❌ Payment Failed: $${(data.amount / 100).toFixed(2)}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '❌ Payment Failed',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Product:*\n${data.productName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Amount:*\n$${(data.amount / 100).toFixed(2)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Reason:*\n${data.reason || 'Unknown'}`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `⚠️ Action may be needed - check Stripe dashboard`,
          },
        ],
      },
    ],
  };

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch (error) {
    logger.error('payment_failure.notification_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

```

**Integrate into Webhook Handler:**

```typescript
// In app/api/stripe/webhook/route.ts
// Add after successful order creation:

import { notifyNewSale, notifyPaymentFailure } from '@/lib/sales-notify';

// After order is saved successfully:
await notifyNewSale({
  orderId: orderData.id,
  customerEmail: orderData.customer_email,
  productName: offerConfig?.productName || offerId,
  amount: session.amount_total || 0,
  affiliateId: metadata.affiliateId,
});

// On payment failure:
await notifyPaymentFailure({
  customerEmail: session.customer_details?.email || 'unknown',
  productName: offerConfig?.productName || offerId,
  amount: session.amount_total || 0,
  reason: 'Payment declined',
});
```

---

### 3. Error Detection & Alerting

**Create Error Monitoring Endpoint:**

```typescript
// app/api/monitoring/errors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { sendOpsAlert } from '@/lib/ops-notify';

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

    const errorCount = recentErrors.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    const paymentFailureCount = parseInt(paymentFailures.rows[0]?.count || '0');
    const ghlFailureCount = parseInt(ghlFailures.rows[0]?.count || '0');

    // Alert if errors exceed threshold
    if (errorCount > 5) {
      await sendOpsAlert('⚠️ High error rate detected', {
        errorCount,
        lastHour: true,
        details: recentErrors.rows.slice(0, 3),
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
        byType: recentErrors.rows,
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
```

---


## 🎯 Quick Setup Guide

### Step 1: Add Environment Variables

```bash
# In Vercel Dashboard, add these:
MONITORING_TOKEN=generate_random_32_char_string
SLACK_SALES_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SALES/WEBHOOK
```

### Step 2: Create Slack Channels

1. **#sales-notifications** - Real-time sales pings
2. **#system-alerts** - Errors and issues
3. **#daily-reports** - Summary reports

### Step 3: Set Up Webhooks

```bash
# In Slack, go to:
# Apps → Incoming Webhooks → Add New Webhook

# Create webhooks for:
# - Sales notifications → SLACK_SALES_WEBHOOK_URL
# - System alerts → SLACK_ALERT_WEBHOOK_URL (already have)
```

### Step 4: Test Everything

```bash
# Test sales endpoint
curl -H "Authorization: Bearer YOUR_MONITORING_TOKEN" \
  https://your-domain.com/api/monitoring/sales

# Test error endpoint
curl -H "Authorization: Bearer YOUR_MONITORING_TOKEN" \
  https://your-domain.com/api/monitoring/errors
```

---

## 📱 Mobile Monitoring (Optional)

### Slack Mobile App

Install Slack mobile app and:
1. Enable push notifications for #sales-notifications
2. Set up critical alerts to bypass Do Not Disturb
3. Create widgets on home screen for quick access

### Simple Dashboard Bookmark

Create a simple HTML dashboard you can bookmark on your phone:

```html
<!-- public/dashboard.html -->
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Store Dashboard</title>
  <style>
    body { font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
    .metric { background: #f0f0f0; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .metric h3 { margin: 0 0 10px 0; }
    .value { font-size: 24px; font-weight: bold; }
    .loading { color: #666; }
    button { background: #0070f3; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>💰 Sales Dashboard</h1>
  <button onclick="refresh()">Refresh</button>
  <div id="dashboard">
    <p class="loading">Loading...</p>
  </div>

  <script>
    const MONITORING_TOKEN = 'YOUR_TOKEN_HERE';
    const API_URL = 'https://your-domain.com/api/monitoring/sales';

    async function refresh() {
      document.getElementById('dashboard').innerHTML = '<p class="loading">Loading...</p>';
      
      try {
        const response = await fetch(API_URL, {
          headers: { 'Authorization': `Bearer ${MONITORING_TOKEN}` }
        });
        const data = await response.json();

        document.getElementById('dashboard').innerHTML = `
          <div class="metric">
            <h3>Last Hour</h3>
            <div class="value">${data.lastHour.order_count} orders</div>
            <div>$${(data.lastHour.revenue / 100).toFixed(2)}</div>
          </div>
          <div class="metric">
            <h3>Today</h3>
            <div class="value">${data.today.order_count} orders</div>
            <div>$${(data.today.revenue / 100).toFixed(2)}</div>
            <div>${data.today.unique_customers} customers</div>
          </div>
          <div class="metric">
            <h3>Active Checkouts</h3>
            <div class="value">${data.pendingCheckouts}</div>
            <div>People in checkout process</div>
          </div>
          <p style="text-align: center; color: #666; margin-top: 20px;">
            Last updated: ${new Date(data.timestamp).toLocaleTimeString()}
          </p>
        `;
      } catch (error) {
        document.getElementById('dashboard').innerHTML = `
          <p style="color: red;">Error loading data: ${error.message}</p>
        `;
      }
    }

    // Auto-refresh every 5 minutes
    refresh();
    setInterval(refresh, 5 * 60 * 1000);
  </script>
</body>
</html>
```

---

## 🚨 Alert Severity Levels

### 🔴 CRITICAL (Immediate Action)
- Site completely down
- Database connection lost
- 10+ payment failures in 10 minutes
- Zero sales for 4+ hours during business hours

**Action:** Page on-call engineer, investigate immediately

### 🟡 WARNING (Check Within 30 Minutes)
- Slow response times (>3 seconds)
- 3-5 payment failures in 10 minutes
- GHL sync failures
- Error rate >1%

**Action:** Check Slack, investigate when convenient

### 🟢 INFO (Daily Review)
- Daily revenue reports
- Manual sales dashboard spot-checks
- Normal operational logs

**Action:** Review in daily standup

---

## 📊 What You'll See Day-to-Day

### Morning (9 AM)
✅ Overnight summary in Slack
✅ Any alerts that fired
✅ Yesterday's total revenue

### Throughout the Day
💰 Real-time ping for each sale
📊 Manual sales dashboard checks
⚠️ Immediate alerts for errors

### Evening (6 PM)
✅ Day's total revenue
✅ Order count and average order value
✅ Any issues that need attention

---

## 🎯 Quick Reference

### Monitoring URLs
```bash
# Sales dashboard
https://your-domain.com/api/monitoring/sales

# Error check
https://your-domain.com/api/monitoring/errors

# System health
https://your-domain.com/api/monitoring/health
```

### What to Watch For
- **Orders per hour** - Should see regular activity
- **Last order timestamp** - Shouldn't be >1 hour old during business hours
- **Error count** - Should be near zero
- **Payment failures** - Occasional is normal, pattern is concerning

### When to Worry
- No sales for 2+ hours (9 AM - 9 PM)
- Error rate >5 in an hour
- Payment failure rate >10%
- Database connection issues

---

**Remember:** Good monitoring means you know about problems before customers complain!
