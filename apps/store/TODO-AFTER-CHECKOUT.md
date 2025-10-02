# TODO After Checking Out This PR

This is your action checklist after checking out this security audit PR. Complete these tasks before launching to production.

---

## 📋 Immediate Actions (Before Launch)

### 1. Review Documentation (15-30 minutes)

Read these in order:
- [ ] `SECURITY-README.md` - Quick overview of what was done
- [ ] `SECURITY-AUDIT-SUMMARY.md` - Executive summary and business impact
- [ ] `PRE-LAUNCH-CHECKLIST.md` - Complete checklist for launch
- [ ] `REAL-TIME-MONITORING-GUIDE.md` - Monitoring setup

### 2. Configure Environment Variables in Vercel (10 minutes)

**Required:**
- [ ] Set `REDACT_LOGS=true` in production environment
- [ ] Verify `STRIPE_SECRET_KEY` starts with `sk_live_` (not `sk_test_`)
- [ ] Verify `STRIPE_WEBHOOK_SECRET` is configured
- [ ] Verify `NEXT_PUBLIC_SITE_URL` uses HTTPS
- [ ] Verify `GHL_PAT_LOCATION` is set
- [ ] Verify `GHL_LOCATION_ID` is set

**For Monitoring (Recommended):**
- [ ] Generate and set `MONITORING_TOKEN` (32 random characters)
- [ ] Generate and set `CRON_SECRET` (32 random characters)
- [ ] Set `SLACK_ALERT_WEBHOOK_URL` (for error alerts)
- [ ] Set `SLACK_SALES_WEBHOOK_URL` (for sales notifications)

**Generate tokens:**
```bash
# Run these to generate secure tokens
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Set Up Slack Webhooks (10 minutes)

**Create Slack Channels:**
- [ ] Create `#sales-notifications` channel
- [ ] Create `#system-alerts` channel (or use existing)

**Create Webhooks:**
1. [ ] Go to https://api.slack.com/apps
2. [ ] Select your workspace app (or create new)
3. [ ] Go to "Incoming Webhooks" → Enable
4. [ ] Add webhook to `#sales-notifications` → Copy URL → Set as `SLACK_SALES_WEBHOOK_URL`
5. [ ] Add webhook to `#system-alerts` → Copy URL → Set as `SLACK_ALERT_WEBHOOK_URL`

### 4. Run Security Tests (5 minutes)

```bash
cd apps/store

# Run security tests
pnpm test tests/security

# Expected: ✓ 29/29 tests passing
```

### 5. Test Security Headers (2 minutes)

```bash
# Test your production domain
curl -I https://your-domain.com/api/health

# Verify these headers exist:
# - Strict-Transport-Security
# - X-Frame-Options
# - X-Content-Type-Options
# - X-XSS-Protection
```

### 6. Test Monitoring Endpoints (5 minutes)

```bash
# Replace YOUR_TOKEN with your MONITORING_TOKEN
export MONITORING_TOKEN="your_token_here"

# Test sales monitoring
curl -H "Authorization: Bearer $MONITORING_TOKEN" \
  https://your-domain.com/api/monitoring/sales

# Test error monitoring
curl -H "Authorization: Bearer $MONITORING_TOKEN" \
  https://your-domain.com/api/monitoring/errors
```

---

## 🔍 Verification Steps (10 minutes)

### Before Going Live:

1. [ ] **Check Vercel Logs** - Verify PII is redacted
   - Go to Vercel Dashboard → Logs
   - Search for `level:error`
   - Should see `[EMAIL_REDACTED]` not actual emails

2. [ ] **Test Stripe Webhook**
   ```bash
   # Install Stripe CLI if needed
   stripe listen --forward-to https://your-domain.com/api/stripe/webhook
   
   # In another terminal, trigger test event
   stripe trigger checkout.session.completed
   ```

3. [ ] **Test a Real Purchase** (use test mode first)
   - [ ] Complete checkout flow
   - [ ] Verify order in database
   - [ ] Check Slack for sale notification
   - [ ] Verify GHL contact created
   - [ ] Check webhook logs

4. [ ] **Review PRE-LAUNCH-CHECKLIST.md**
   - Complete all CRITICAL items
   - Review IMPORTANT items
   - Schedule RECOMMENDED items for Week 1-2

---

## 📊 Post-Launch Monitoring (Ongoing)

### Day 1 After Launch:

- [ ] Monitor Slack for sales notifications
- [ ] Watch for error alerts
- [ ] Check `/api/monitoring/sales` endpoint hourly
- [ ] Review Vercel logs for any issues
- [ ] Verify hourly summaries arrive in Slack

### Week 1 After Launch:

- [ ] Review `SECURITY-IMPLEMENTATION-GUIDE.md` for Week 1 tasks
- [ ] Consider upgrading to Redis-based rate limiting
- [ ] Set up CORS configuration
- [ ] Add Content-Security-Policy (start with report-only)
- [ ] Run load tests (1000 req/min)

---

## 🚨 If Something Goes Wrong

### Immediate Actions:

1. **Check Slack Alerts** - Automatic notifications will appear
2. **Check Error Monitoring:**
   ```bash
   curl -H "Authorization: Bearer $MONITORING_TOKEN" \
     https://your-domain.com/api/monitoring/errors
   ```
3. **Check Vercel Logs** - Go to Vercel Dashboard → Logs
4. **Review PRE-LAUNCH-CHECKLIST.md** - Section: Emergency Procedures

### Rollback Plan:

If critical issues occur:
```bash
# In Vercel Dashboard:
# 1. Go to Deployments
# 2. Find previous stable deployment
# 3. Click "..." → Promote to Production
```

---

## 📞 Quick Reference

### Important URLs:
- Vercel Dashboard: https://vercel.com/dashboard
- Slack Webhooks: https://api.slack.com/apps
- Stripe Dashboard: https://dashboard.stripe.com
- Stripe Webhooks: https://dashboard.stripe.com/webhooks

### Documentation Files:
- **Start Here:** `SECURITY-README.md`
- **Executive Summary:** `SECURITY-AUDIT-SUMMARY.md`
- **Launch Checklist:** `PRE-LAUNCH-CHECKLIST.md`
- **Monitoring Setup:** `REAL-TIME-MONITORING-GUIDE.md`
- **Implementation Guide:** `SECURITY-IMPLEMENTATION-GUIDE.md`
- **Detailed Findings:** `SECURITY-AUDIT.md`

### Environment Variables Needed:
```bash
# Security (Required)
REDACT_LOGS=true

# Monitoring (Recommended)
MONITORING_TOKEN=<generate-random-32-chars>
CRON_SECRET=<generate-random-32-chars>
SLACK_SALES_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## ✅ Final Checklist

Before marking as "Ready for Launch":

- [ ] All environment variables configured in Vercel
- [ ] Security tests passing (29/29)
- [ ] Security headers verified with curl
- [ ] Slack webhooks tested
- [ ] Monitoring endpoints tested
- [ ] Documentation reviewed
- [ ] PRE-LAUNCH-CHECKLIST.md completed (CRITICAL items)
- [ ] Test purchase successful
- [ ] Team briefed on monitoring and alerts

**Estimated Time to Complete:** 1-2 hours

---

## 🎯 Success Metrics

After launch, you should see:

- ✅ Real-time Slack notification for every sale
- ✅ Hourly summaries in Slack
- ✅ Zero PII in production logs
- ✅ All security headers present
- ✅ Error alerts if issues occur
- ✅ No sales alerts trigger (unless actually no sales)

---

**Questions?** Review the comprehensive guides in the `apps/store/` directory or check the PR description for detailed information.
