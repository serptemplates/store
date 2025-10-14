# Production Deployment Checklist

## 🚀 Pre-Deployment Verification

### Environment Variables
```bash
# Required Environment Variables Checklist
□ DATABASE_URL - PostgreSQL connection string configured
□ STRIPE_SECRET_KEY_LIVE - Production Stripe secret key (sk_live_...)
□ STRIPE_WEBHOOK_SECRET_LIVE - Webhook endpoint secret from Stripe Dashboard
□ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE - Production publishable key (pk_live_...)
□ NEXT_PUBLIC_CHECKOUT_URL - Set to production domain /api/checkout/session
□ GHL_API_BASE_URL - https://services.leadconnectorhq.com
□ GHL_LOCATION_ID - Your GHL location ID
□ GHL_PAT_LOCATION - Your GHL personal access token
□ NEXT_PUBLIC_GTM_ID - Google Tag Manager container ID
□ NEXT_PUBLIC_GA4_ID - Google Analytics 4 measurement ID
□ NEXT_PUBLIC_FB_PIXEL_ID - Facebook Pixel ID
□ NEXT_PUBLIC_POSTHOG_KEY - PostHog project API key (optional, enables session recording)
□ NEXT_PUBLIC_POSTHOG_HOST - Custom PostHog API host (optional)
□ POSTHOG_API_KEY - PostHog server API key (optional, enables backend event capture)
□ POSTHOG_API_HOST - Custom PostHog server API host (optional)
□ NEXT_PUBLIC_SITE_URL - Production domain (https://yourdomain.com)
```

### Stripe Configuration
```bash
□ Production API keys configured in .env
□ Webhook endpoint created in Stripe Dashboard
  - Endpoint URL: https://yourdomain.com/api/stripe/webhook
  - Events to listen for:
    * checkout.session.completed
    * checkout.session.expired
    * payment_intent.succeeded
    * payment_intent.payment_failed
□ Webhook signing secret added to environment variables
□ Test webhook with Stripe CLI: stripe trigger checkout.session.completed
```

### Database Setup
```bash
□ Production database provisioned
□ Database migrations run
□ Indexes created for query optimization
□ Connection pooling configured
□ Backup strategy in place
```

### GHL Integration
```bash
□ GHL API credentials configured
□ Location ID verified
□ Custom fields created in GHL:
  - orderValue
  - productPurchased
  - affiliateId
  - orderDate
□ Tags configured for product purchases
□ Webhook retry logic tested
```

## 🧪 Testing Checklist

### End-to-End Purchase Flow
```bash
□ Product page loads correctly
□ Add to cart functionality works
□ Stripe checkout session creates successfully
□ Payment processes correctly
□ Success page displays with order details
□ Order saved to database
□ GHL contact created/updated
□ Confirmation email sent (if configured)
```

### Tracking & Analytics
```bash
□ GTM container loads on all pages
□ GA4 events firing correctly:
  - page_view
  - view_item
  - begin_checkout
  - purchase
□ Facebook Pixel events tracking
□ Conversion values passing correctly
□ Duplicate event prevention working
```

### SEO & Schema
```bash
□ Schema markup validated with Google Rich Results Test
□ Product schema on all product pages
□ Video schema for product videos
□ Organization schema in place
□ Sitemap generated and accessible
□ Robots.txt configured
```

### Performance
```bash
□ Lighthouse score > 90
□ Core Web Vitals passing
□ Images optimized
□ CDN configured
□ Caching headers set
```

### Redirects & Migration
```bash
□ All old URLs redirecting correctly
□ UTM parameters preserved
□ Affiliate tracking maintained
□ 404 monitoring in place
```

## 📊 Monitoring Setup

### Error Tracking
```bash
□ Error logging service configured (e.g., Sentry)
□ Webhook failure alerts set up
□ Database connection monitoring
□ API endpoint monitoring
```

### Analytics Dashboard
```bash
□ Google Analytics real-time view accessible
□ Conversion tracking verified
□ Revenue tracking accurate
□ Traffic sources identified
```

### Business Metrics
```bash
□ Order tracking dashboard
□ GHL sync status monitoring
□ Payment failure tracking
□ Cart abandonment tracking
```

## 🚨 Launch Day Tasks

### Pre-Launch (T-4 hours)
```bash
□ Final backup of old system
□ DNS TTL reduced to 5 minutes
□ Team briefed on rollback procedure
□ Support team notified
```

### Launch (T-0)
```bash
□ Deploy to production
□ Update DNS records
□ Verify SSL certificate
□ Test critical paths immediately
□ Monitor error logs
```

### Post-Launch (T+1 hour)
```bash
□ Verify first real transaction
□ Check all tracking pixels
□ Confirm GHL sync working
□ Review 404 logs
□ Monitor server resources
```

### Post-Launch (T+24 hours)
```bash
□ Review conversion rates
□ Analyze user behavior
□ Address any bug reports
□ Optimize based on metrics
□ Document lessons learned
```

## 🔄 Rollback Plan

If critical issues arise:

1. **Immediate Actions**
   ```bash
   □ Revert DNS to old system
   □ Communicate with customers
   □ Document issue details
   ```

2. **Recovery Steps**
   ```bash
   □ Fix identified issues
   □ Test in staging environment
   □ Plan new deployment window
   ```

## 📝 Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA Tester | | | |
| Product Owner | | | |
| DevOps | | | |

## 🎯 Success Metrics

Target metrics for first 7 days:

- **Uptime**: > 99.9%
- **Conversion Rate**: >= Previous system
- **Page Load Time**: < 3 seconds
- **Error Rate**: < 0.1%
- **GHL Sync Success**: > 99%

---

Last Updated: $(date)
Ready for Production: ⬜ (Check when complete)
