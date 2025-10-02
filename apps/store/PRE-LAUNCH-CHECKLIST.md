# Pre-Launch Security Verification

**Date:** ___________  
**Reviewed By:** ___________  
**Status:** ⬜ Ready for Launch

---

## 🔴 CRITICAL - Must Complete Before Launch

### Security Headers
- [ ] Run: `curl -I https://your-domain.com/api/health`
- [ ] Verify `Strict-Transport-Security` header present
- [ ] Verify `X-Frame-Options: DENY` header present
- [ ] Verify `X-Content-Type-Options: nosniff` header present
- [ ] Verify `X-XSS-Protection: 1; mode=block` header present

### PII Protection
- [ ] Set `REDACT_LOGS=true` in Vercel production environment
- [ ] Run: `pnpm test tests/security/logger-redaction.test.ts`
- [ ] All PII redaction tests passing
- [ ] Verify no customer emails in production logs (check Vercel logs)
- [ ] Verify no phone numbers in production logs

### Environment Variables
- [ ] All required variables configured in Vercel
- [ ] `STRIPE_SECRET_KEY` starts with `sk_live_` (not test key)
- [ ] `STRIPE_WEBHOOK_SECRET` configured and valid
- [ ] `NEXT_PUBLIC_SITE_URL` uses HTTPS
- [ ] `GHL_PAT_LOCATION` and `GHL_LOCATION_ID` configured
- [ ] `SLACK_ALERT_WEBHOOK_URL` configured for ops alerts

### Rate Limiting
- [ ] Test checkout API: `ab -n 100 -c 10 https://your-domain.com/api/checkout/session`
- [ ] Verify rate limiting kicks in after threshold
- [ ] Verify 429 responses include retry headers
- [ ] Consider upgrading to Redis-based rate limiting (recommended)

### Webhook Security
- [ ] Stripe webhook endpoint created: `https://your-domain.com/api/stripe/webhook`
- [ ] Webhook signature validation tested with Stripe CLI
- [ ] Test webhook with: `stripe trigger checkout.session.completed`
- [ ] Verify webhook logs show successful processing
- [ ] PayPal webhook configured (if using PayPal)

---

## 🟡 IMPORTANT - Complete Within Week 1

### API Security
- [ ] Request size limits applied to checkout API
- [ ] Content-Type validation on all POST routes
- [ ] CORS configured for your domain(s)
- [ ] Error messages sanitized (no stack traces in production)

### Monitoring
- [ ] Slack alerts tested and working
- [ ] Set up Vercel log alerts for errors
- [ ] Configure alert for payment failures > 5%
- [ ] Test ops alert: `curl -X POST $SLACK_ALERT_WEBHOOK_URL -d '{"text":"Test alert"}'`

### Database
- [ ] Connection string uses SSL
- [ ] Database backups configured (daily minimum)
- [ ] Verify indexes exist: `\di` in psql
- [ ] Connection pooling configured
- [ ] Test backup restore procedure

### Payment Processing
- [ ] Test successful payment in production (small amount)
- [ ] Verify order saved to database
- [ ] Verify GHL contact created
- [ ] Verify webhook processed successfully
- [ ] Test failed payment scenario

---

## 🟢 RECOMMENDED - Complete Within Week 2

### Advanced Security
- [ ] Implement Redis-based rate limiting
- [ ] Add Content-Security-Policy header
- [ ] Test CSP policy doesn't break functionality
- [ ] Configure log retention policy
- [ ] Set up automated security scanning

### Compliance
- [ ] Privacy policy updated with data collection details
- [ ] Terms of service updated
- [ ] Cookie consent banner implemented
- [ ] GDPR data export API (if serving EU customers)
- [ ] Refund policy documented

### Performance
- [ ] Run Lighthouse audit (target score > 90)
- [ ] Load test: 1000 requests/minute for 5 minutes
- [ ] Database query performance reviewed
- [ ] CDN configured for static assets
- [ ] Image optimization verified

### Testing
- [ ] All security tests passing: `pnpm test tests/security`
- [ ] Integration tests passing: `pnpm test tests/api`
- [ ] Smoke tests passing: `pnpm test:smoke`
- [ ] Manual end-to-end test of complete purchase flow
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Mobile testing (iOS, Android)

---

## 📊 Verification Tests

### Test 1: Security Headers
```bash
curl -I https://your-domain.com/api/health
```

**Expected output:**
```
HTTP/2 200
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-frame-options: DENY
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
referrer-policy: strict-origin-when-cross-origin
```

### Test 2: Rate Limiting
```bash
# Should succeed
for i in {1..30}; do curl -X POST https://your-domain.com/api/checkout/session -H "Content-Type: application/json" -d '{"offerId":"test"}'; done

# Should return 429
for i in {31..35}; do curl -X POST https://your-domain.com/api/checkout/session -H "Content-Type: application/json" -d '{"offerId":"test"}'; done
```

### Test 3: PII Redaction
```bash
# Check recent logs in Vercel
# Search for: @customer
# Should show [EMAIL_REDACTED] not actual emails
```

### Test 4: Webhook Validation
```bash
# Test with Stripe CLI
stripe listen --forward-to https://your-domain.com/api/stripe/webhook
stripe trigger checkout.session.completed
```

**Expected:** Webhook processed successfully, order created in database

### Test 5: Environment Validation
```bash
# Should start without errors
pnpm dev
```

**Expected:** See log: `"event":"env.validation_success"`

### Test 6: Payment Flow
```bash
# Manual test
1. Go to product page
2. Click "Buy Now"
3. Complete Stripe checkout (use test card in test mode)
4. Verify success page shows
5. Check database: SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;
6. Check GHL: Verify contact created with purchase tag
```

---

## 🚨 Launch Day Checklist

### T-4 Hours
- [ ] Final backup of database
- [ ] Team briefed on launch procedure
- [ ] Support team notified
- [ ] Rollback procedure documented
- [ ] Emergency contacts list prepared

### T-1 Hour
- [ ] Deploy to production
- [ ] Verify deployment successful (check Vercel dashboard)
- [ ] Run smoke tests
- [ ] Check all environment variables loaded
- [ ] Verify SSL certificate valid

### T-0 (Launch)
- [ ] Update DNS (if needed)
- [ ] Verify site loads
- [ ] Test checkout flow with test card
- [ ] Monitor error logs for 30 minutes
- [ ] Check database connections
- [ ] Verify webhooks processing

### T+1 Hour
- [ ] Process first real transaction
- [ ] Verify order in database
- [ ] Verify GHL sync
- [ ] Check analytics tracking
- [ ] Review error rate (should be < 0.1%)

### T+24 Hours
- [ ] Review conversion rate vs. old system
- [ ] Check for any user-reported issues
- [ ] Analyze performance metrics
- [ ] Review all alert notifications
- [ ] Document any lessons learned

---

## 📱 Emergency Procedures

### If Site is Down
1. Check Vercel status page
2. Check DNS resolution: `dig your-domain.com`
3. Check SSL: `curl -I https://your-domain.com`
4. Roll back deployment if needed
5. Notify customers via status page

### If Payments Failing
1. Check Stripe Dashboard for errors
2. Verify webhook endpoint responding
3. Check database connectivity
4. Review recent code changes
5. Rollback if necessary

### If Data Breach Suspected
1. **DO NOT PANIC** - Document everything
2. Immediately rotate all API keys
3. Review logs for unauthorized access
4. Contact security team
5. Notify affected customers if PII exposed
6. File incident report

### Contact Numbers
- **Stripe Support:** https://support.stripe.com
- **Vercel Support:** https://vercel.com/help
- **Lead Developer:** _______________
- **DevOps:** _______________
- **Security:** _______________

---

## ✅ Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| **Developer** | | | |
| **Security Lead** | | | |
| **QA Lead** | | | |
| **Product Owner** | | | |
| **DevOps** | | | |

---

## 📝 Post-Launch Review

**Date:** ___________  
**Status:** ___________

### Metrics (First Week)
- Uptime: ________%
- Total orders: ________
- Failed payments: ________
- Average response time: ________ms
- Error rate: ________%

### Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Action Items
- [ ] _______________________________________________
- [ ] _______________________________________________
- [ ] _______________________________________________

---

**This document must be completed before launching to production.**

**Risk Assessment:**
- All CRITICAL items completed: ⬜ LOW RISK / ⬜ MEDIUM RISK / ⬜ HIGH RISK
- All IMPORTANT items completed: ⬜ LOW RISK / ⬜ MEDIUM RISK / ⬜ HIGH RISK

**Final Decision:** ⬜ GO LIVE / ⬜ DELAY LAUNCH

**Approved By:** _______________  
**Date:** _______________
