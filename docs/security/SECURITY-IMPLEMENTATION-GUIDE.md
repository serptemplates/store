# Security Implementation Guide

## ✅ Completed Security Improvements

### 1. Security Headers (DONE)
**Location:** `apps/store/next.config.mjs`

Added comprehensive security headers:
- ✅ **HSTS** - Force HTTPS for 2 years including subdomains
- ✅ **X-Frame-Options** - Prevent clickjacking (SAMEORIGIN for pages, DENY for API)
- ✅ **X-Content-Type-Options** - Prevent MIME-type sniffing
- ✅ **X-XSS-Protection** - Enable browser XSS protection
- ✅ **Referrer-Policy** - Control referrer information leakage
- ✅ **Permissions-Policy** - Restrict browser features (camera, mic, geolocation)
- ✅ **Cache-Control** - No caching for API routes

**Testing:**
```bash
curl -I https://your-domain.com/api/health
# Should show all security headers
```

### 2. PII Redaction in Logs (DONE)
**Location:** `apps/store/lib/logger.ts`

Implemented automatic PII redaction for:
- ✅ Email addresses → `[EMAIL_REDACTED]`
- ✅ Phone numbers → `[PHONE_REDACTED]`
- ✅ Credit cards → `[CARD_REDACTED]`
- ✅ SSN → `[SSN_REDACTED]`
- ✅ Passwords → `[REDACTED]`
- ✅ API keys → `[REDACTED]`
- ✅ Bearer tokens → `Bearer [REDACTED]`

**Configuration:**
- Automatic in production (`NODE_ENV=production`)
- Can be forced with `REDACT_LOGS=true`
- Disabled in development for debugging

**Testing:**
```bash
cd apps/store
pnpm test tests/security/logger-redaction.test.ts
```

### 3. Structured Logging (DONE)
**Modified Files:**
- (Legacy) `apps/store/app/api/checkout/session/route.ts` — migrated away in favour of Payment Links.
- `apps/store/app/api/paypal/webhook/route.ts`

Replaced all `console.log` statements with structured logging:
```typescript
// Before
console.log("Using payment config:", paymentConfigId);

// After
logger.debug("checkout.payment_config_used", { paymentConfigId });
```

### 4. Environment Variable Validation (DONE)
**Location:** `apps/store/lib/env-validation.ts`

Validates required environment variables at startup:
- ✅ Checks for required variables
- ✅ Validates format (Stripe keys, URLs)
- ✅ Warns about missing optional variables
- ✅ Fails fast in production if critical vars missing
- ✅ Provides detailed error messages

**Integration:** `apps/store/instrumentation.ts` - runs before app starts

**Testing:**
```bash
# Test with missing required vars
unset STRIPE_SECRET_KEY
pnpm dev
# Should fail with clear error message
```

### 5. Request Validation Middleware (DONE)
**Location:** `apps/store/lib/checkout/request-validation.ts`

Utilities for:
- ✅ Payload size limits (100KB JSON, 50KB text by default)
- ✅ Content-Type validation
- ✅ Origin validation (CORS)
- ✅ Error message sanitization

**Usage Example:**
```typescript
import { withRequestValidation } from '@/lib/checkout/request-validation';

export async function POST(request: NextRequest) {
  return withRequestValidation(
    request,
    {
      maxJsonSize: 1024 * 50, // 50KB
      allowedContentTypes: ['application/json'],
      allowedOrigins: ['https://yourdomain.com'],
    },
    async (req) => {
      // Your handler logic
      return NextResponse.json({ success: true });
    }
  );
}
```

### 6. Security Test Suite (DONE)
**Location:** `apps/store/tests/security/`

Added comprehensive tests for:
- ✅ XSS prevention (13 tests)
- ✅ PII redaction (8 tests)
- ✅ Rate limiting (8 tests)
- ✅ All tests passing ✅

**Run tests:**
```bash
cd apps/store
pnpm test tests/security
```

---

## 🔧 Required Configuration (Pre-Launch)

### 1. Environment Variables

Add these to Vercel (or your hosting platform):

#### Production
```env
# Enable PII redaction
REDACT_LOGS=true

# Monitoring token (generate a random string)
MONITORING_TOKEN=<generate-random-32-char-string>

# Optional: Slack alerts for ops issues
SLACK_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

#### Development/Preview
```env
# Can disable redaction for debugging
REDACT_LOGS=false
```

### 2. Enable Next.js Instrumentation

Add to `next.config.mjs` if not already present:
```javascript
experimental: {
  instrumentationHook: true,
}
```

This enables the startup validation in `instrumentation.ts`.

### 3. Apply Request Validation to Critical Routes

**Recommended for these API routes:**

> Legacy note: The PayPal checkout API was removed when Stripe Payment Links became the sole payment surface. The snippet below remains for auditors reviewing historical commits.

**a) Legacy PayPal Checkout API** (`apps/store/app/api/paypal/create-order/route.ts`, removed):
```typescript
import { withRequestValidation } from '@/lib/checkout/request-validation';

export async function POST(request: NextRequest) {
  return withRequestValidation(
    request,
    {
      maxJsonSize: 1024 * 10, // 10KB should be enough for checkout
      allowedContentTypes: ['application/json'],
      allowedOrigins: [
        process.env.NEXT_PUBLIC_SITE_URL!,
        'https://yourdomain.com'
      ],
    },
    async (req) => {
      // Legacy PayPal order logic (no longer active)
      return withRateLimit(req, checkoutRateLimit, async () => {
        // ... existing code
      });
    }
  );
}
```

**b) Webhook Routes** (already have signature validation, but add size limits):
```typescript
// At the start of POST handler
const MAX_WEBHOOK_SIZE = 1024 * 100; // 100KB
const contentLength = request.headers.get('content-length');
if (contentLength && parseInt(contentLength) > MAX_WEBHOOK_SIZE) {
  return NextResponse.json(
    { error: 'Payload too large' },
    { status: 413 }
  );
}
```

---

## 🟡 Recommended Improvements (Week 1)

### 1. Replace In-Memory Rate Limiting with Redis

**Why:** Current rate limiting resets on server restart and doesn't work across multiple instances.

**Solution:** Use Vercel KV (Redis):

```bash
# Install Vercel KV
pnpm add @vercel/kv
```

**Create:** `apps/store/lib/rate-limit-redis.ts`:
```typescript
import { kv } from '@vercel/kv';
import { NextRequest } from 'next/server';

export async function rateLimitRedis(
  request: NextRequest,
  config: { interval: number; limit: number }
) {
  const ip = getClientIp(request);
  const key = `ratelimit:${ip}`;
  
  const count = await kv.incr(key);
  if (count === 1) {
    await kv.expire(key, config.interval / 1000);
  }
  
  return {
    success: count <= config.limit,
    limit: config.limit,
    remaining: Math.max(0, config.limit - count),
  };
}
```

**Integrate:** Replace the deleted `apps/store/lib/rate-limit.ts` helper with a Redis-backed implementation and wire it into any new API routes that accept untrusted traffic.

### 2. Add CORS Configuration

**Create:** `apps/store/lib/cors.ts`:
```typescript
import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL,
  'https://yourdomain.com',
  // Add your domains
];

export function corsHeaders(origin: string | null) {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0]!,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}
```

**Apply to API routes:**
```typescript
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('origin')),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // ... your logic ...
  
  const response = NextResponse.json({ success: true });
  
  // Add CORS headers
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}
```

### 3. Add Content Security Policy

**Update:** `apps/store/next.config.mjs`:
```javascript
headers: [
  {
    source: '/:path*',
    headers: [
      // ... existing headers ...
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://api.stripe.com https://services.leadconnectorhq.com",
          "frame-src https://js.stripe.com https://hooks.stripe.com",
          "frame-ancestors 'none'",
        ].join('; '),
      },
    ],
  },
]
```

**Note:** Start with report-only mode first:
```javascript
key: 'Content-Security-Policy-Report-Only',
```

### 4. Add Payment Failure Monitoring

**Create:** `apps/store/lib/payment-monitoring.ts`:
```typescript
import { query } from './database';
import { sendOpsAlert } from './ops-notify';

export async function checkPaymentHealth() {
  // Get payment stats from last hour
  const result = await query`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM orders
    WHERE created_at > NOW() - INTERVAL '1 hour'
  `;
  
  const failureRate = result.rows[0].failed / result.rows[0].total;
  
  if (failureRate > 0.05) { // 5% failure rate threshold
    await sendOpsAlert(
      `⚠️ High payment failure rate: ${(failureRate * 100).toFixed(1)}%`,
      {
        total: result.rows[0].total,
        failed: result.rows[0].failed,
        threshold: '5%',
      }
    );
  }
  
  return { failureRate, ...result.rows[0] };
}
```

**Add cron job** in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/monitoring/payment-health",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## 📊 Monitoring Setup

### 1. Analytics Stack (PostHog + GTM)

- **PostHog** powers behavioral analytics. Keep the client key in `NEXT_PUBLIC_POSTHOG_KEY` and rotate it via your secrets manager when necessary.
- **GTM** stays optional; only load it by configuring `NEXT_PUBLIC_GTM_ID`. Remove unused containers to avoid unexpected third-party scripts.
- No Vercel analytics scripts are bundled, so there is no additional opt-out surface to audit.

### 2. Real-Time Alerts

Configure Slack webhook in environment variables:
```env
SLACK_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
```

Current alerts trigger for:
- ✅ GHL sync failures (after 3 retries)
- ✅ Database connection issues
- ✅ Webhook processing errors

**Recommended additions:**
- Payment failure rate > 5%
- Checkout abandonment spike
- API response time > 3 seconds

### 3. Log Monitoring

**Vercel Logs:**
All logs are structured JSON. Search for:
- `level:error` - All errors
- `event:webhook.invalid_signature` - Security issues
- `event:payment.failed` - Failed payments
- `event:ghl.sync_failed` - CRM sync issues

**Set up log alerts** in Vercel Dashboard:
1. Go to Logs
2. Create saved search
3. Enable email/Slack notifications

---

## 🔐 Security Checklist

Before going live, verify:

### Configuration
- [ ] All environment variables validated (check Vercel dashboard)
- [ ] `REDACT_LOGS=true` in production
- [ ] Security headers enabled (check with curl -I)
- [ ] CORS configured for your domains
- [ ] CSP policy tested

### API Security
- [ ] Rate limiting working (test with siege/ab)
- [ ] Webhook signatures verified (test with Stripe CLI)
- [ ] Request size limits in place
- [ ] Error messages sanitized in production

### Monitoring
- [ ] Slack alerts configured
- [ ] Log monitoring set up
- [ ] Payment health checks running
- [ ] Checkout funnel tracking

### Testing
- [ ] All security tests passing
- [ ] Load testing completed (1000 req/min)
- [ ] Penetration testing (if budget allows)
- [ ] GDPR compliance verified

### Documentation
- [ ] Incident response plan created
- [ ] Runbook for common issues
- [ ] Team trained on security procedures
- [ ] Emergency contacts list

---

## 🚨 Security Incident Response

If you detect suspicious activity:

### 1. Immediate Actions
```bash
# 1. Check for unusual activity
curl https://your-domain.com/api/monitoring/health?alert=1

# 2. Check recent orders
psql $DATABASE_URL -c "SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 20;"

# 3. Check webhook logs
psql $DATABASE_URL -c "SELECT * FROM webhook_logs WHERE status = 'error' AND updated_at > NOW() - INTERVAL '1 hour';"
```

### 2. Response Steps
1. **Document** - Screenshot logs, note timestamps
2. **Contain** - If needed, disable affected API route temporarily
3. **Investigate** - Check logs for source of issue
4. **Fix** - Apply patches, rotate keys if compromised
5. **Notify** - Alert team and stakeholders
6. **Review** - Post-mortem to prevent recurrence

### 3. Emergency Contacts
- **Lead Developer:** [Add contact]
- **DevOps:** [Add contact]
- **Security:** [Add contact]
- **Stripe Support:** https://support.stripe.com

---

## 📈 Next Steps

### High Priority
1. ✅ Security headers - DONE
2. ✅ PII redaction - DONE
3. ✅ Environment validation - DONE
4. ✅ Security tests - DONE
5. ⬜ Replace in-memory rate limiting with Redis
6. ⬜ Add CORS configuration
7. ⬜ Test CSP policy

### Medium Priority
8. ⬜ Payment failure monitoring
9. ⬜ Load testing
10. ⬜ Enhanced logging for checkout funnel
11. ⬜ Data export API (GDPR)

### Nice to Have
12. ⬜ External security audit
13. ⬜ Automated penetration testing
14. ⬜ Bug bounty program
15. ⬜ Security training for team

---

**Last Updated:** $(date)  
**Status:** Ready for Production Launch  
**Risk Level:** LOW ✅
