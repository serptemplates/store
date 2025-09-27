# Monitoring & Observability Setup

## 🎯 Overview

Comprehensive monitoring setup for the production store to ensure reliability, performance, and quick issue resolution.

## 📊 Key Metrics to Monitor

### Business Metrics
- **Conversion Rate**: Visitors → Purchases
- **Average Order Value**: Total revenue / Number of orders
- **Cart Abandonment Rate**: Started checkout / Completed
- **Revenue**: Daily, Weekly, Monthly
- **Customer Acquisition Cost**: Marketing spend / New customers

### Technical Metrics
- **Uptime**: Target > 99.9%
- **Response Time**: p50 < 200ms, p99 < 1s
- **Error Rate**: < 0.1%
- **Database Query Time**: < 100ms
- **API Success Rate**: > 99.5%

## 🛠 Monitoring Stack

### 1. Application Monitoring (Vercel Analytics)
```javascript
// Already integrated if deployed on Vercel
// Provides:
// - Web Vitals
// - Performance metrics
// - Error tracking
```

### 2. Error Tracking (Sentry)

#### Installation
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

#### Configuration
```javascript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

#### Error Boundaries
```tsx
// app/error.tsx
'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### 3. Uptime Monitoring

#### Better Uptime (Recommended)
```yaml
# Monitors to create:
- URL: https://yourdomain.com
  Check every: 1 minute
  Alert after: 2 failures

- URL: https://yourdomain.com/api/health
  Check every: 5 minutes
  Expected status: 200

- URL: https://yourdomain.com/api/feeds/google-merchant
  Check every: 1 hour
  Expected status: 200
```

#### Health Check Endpoint
```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { isDatabaseConfigured, query } from '@/lib/database';

export async function GET() {
  const checks = {
    api: 'healthy',
    database: 'unknown',
    stripe: 'unknown',
    ghl: 'unknown',
    timestamp: new Date().toISOString(),
  };

  // Check database
  try {
    if (isDatabaseConfigured()) {
      await query`SELECT 1`;
      checks.database = 'healthy';
    }
  } catch (error) {
    checks.database = 'unhealthy';
  }

  // Check Stripe
  if (process.env.STRIPE_SECRET_KEY) {
    checks.stripe = 'configured';
  }

  // Check GHL
  if (process.env.GHL_PAT_LOCATION) {
    checks.ghl = 'configured';
  }

  const allHealthy = Object.values(checks).every(
    v => v === 'healthy' || v === 'configured' || v.includes('T')
  );

  return NextResponse.json(checks, {
    status: allHealthy ? 200 : 503
  });
}
```

### 4. Analytics Dashboard (Google Analytics)

#### Custom Events to Track
```javascript
// lib/analytics.ts
export const trackEvent = (eventName: string, parameters?: any) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

// Track key events:
trackEvent('begin_checkout', { value: price, currency: 'USD' });
trackEvent('purchase', { value: total, transaction_id: orderId });
trackEvent('add_payment_info', { payment_type: 'stripe' });
trackEvent('view_item', { item_id: productSlug, value: price });
```

#### GA4 Custom Dashboards
Create dashboards for:
1. **E-commerce Overview**
   - Revenue by source
   - Top products
   - Conversion funnel

2. **Real-time Monitoring**
   - Active users
   - Current revenue
   - Live conversions

3. **Error Tracking**
   - 404 pages
   - Failed checkouts
   - API errors

### 5. Database Monitoring

#### Query Performance
```sql
-- Slow query log
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 20;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

### 6. Webhook Monitoring

```typescript
// lib/webhook-monitor.ts
export async function monitorWebhookHealth() {
  const result = await query`
    SELECT
      status,
      COUNT(*) as count,
      MAX(last_attempt_at) as last_attempt
    FROM webhook_logs
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY status
  `;

  const metrics = {
    total: 0,
    success: 0,
    failed: 0,
    pending: 0,
    success_rate: 0,
  };

  result?.rows.forEach(row => {
    metrics.total += parseInt(row.count);
    metrics[row.status] = parseInt(row.count);
  });

  metrics.success_rate = (metrics.success / metrics.total) * 100;

  // Alert if success rate < 95%
  if (metrics.success_rate < 95) {
    await sendAlert('Webhook success rate below threshold', metrics);
  }

  return metrics;
}
```

## 📱 Alert Configuration

### Critical Alerts (Page immediately)
- Site down > 2 minutes
- Payment processing failures > 5 in 10 minutes
- Database connection lost
- Error rate > 5%

### Warning Alerts (Slack/Email)
- Response time > 3s
- Failed GHL syncs > 10
- Memory usage > 90%
- 404 rate increase > 50%

### Info Alerts (Daily digest)
- Daily revenue summary
- Top traffic sources
- New customer count
- Popular products

## 📈 Custom Monitoring Dashboard

### Create a Status Page
```typescript
// app/admin/status/page.tsx
export default async function StatusPage() {
  const metrics = await getMetrics();

  return (
    <div>
      <h1>System Status</h1>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          title="Uptime"
          value={metrics.uptime}
          target=">99.9%"
          status={metrics.uptime > 99.9 ? 'green' : 'red'}
        />

        <MetricCard
          title="Response Time"
          value={metrics.responseTime}
          target="<200ms"
          status={metrics.responseTime < 200 ? 'green' : 'yellow'}
        />

        <MetricCard
          title="Error Rate"
          value={metrics.errorRate}
          target="<0.1%"
          status={metrics.errorRate < 0.1 ? 'green' : 'red'}
        />
      </div>

      <RecentOrders />
      <WebhookStatus />
      <SystemLogs />
    </div>
  );
}
```

## 🔍 Debugging Tools

### 1. Request Logging
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  console.log({
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers),
  });

  return NextResponse.next();
}
```

### 2. Performance Profiling
```typescript
// lib/profiler.ts
export async function profile<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;

    console.log(`[PROFILE] ${name}: ${duration}ms`);

    if (duration > 1000) {
      console.warn(`[SLOW] ${name} took ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[ERROR] ${name} failed after ${duration}ms`, error);
    throw error;
  }
}
```

## 📋 Daily Monitoring Checklist

### Morning Check (9 AM)
- [ ] Review overnight alerts
- [ ] Check error logs
- [ ] Verify backup completed
- [ ] Review conversion metrics

### Afternoon Check (2 PM)
- [ ] Monitor peak traffic handling
- [ ] Check API response times
- [ ] Review GHL sync status
- [ ] Verify payment processing

### Evening Check (6 PM)
- [ ] Daily revenue report
- [ ] Failed transaction review
- [ ] System resource usage
- [ ] Plan for next day

## 🚨 Incident Response

### Severity Levels
- **SEV1**: Complete outage, payment failure
- **SEV2**: Degraded performance, partial outage
- **SEV3**: Minor issues, cosmetic bugs
- **SEV4**: Enhancement requests

### Response Times
- **SEV1**: 15 minutes
- **SEV2**: 1 hour
- **SEV3**: 4 hours
- **SEV4**: Next business day

### Runbook Template
```markdown
## Issue: [Issue Name]

### Symptoms
- What users experience
- Error messages shown

### Detection
- How to identify the issue
- Monitoring alerts triggered

### Resolution
1. Immediate mitigation steps
2. Root cause investigation
3. Permanent fix implementation

### Prevention
- How to prevent recurrence
- Monitoring improvements needed
```

## 🎯 Success Metrics

Track these KPIs weekly:
- Uptime: > 99.9%
- TTFB: < 200ms
- Error rate: < 0.1%
- Conversion rate: > Industry average
- Customer satisfaction: > 4.5/5

---

*Remember: Good monitoring prevents fires, great monitoring prevents smoke.*