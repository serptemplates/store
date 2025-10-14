# Store Migration Checklist: GHL → apps/store

## Payment Processing
- [ ] Verify Stripe payment processing works end-to-end
- [ ] Verify PayPal payment processing works end-to-end
- [ ] Test checkout flow on mobile/desktop/tablet
- [ ] Test refund processing workflow

## Database & Data Persistence
- [ ] Confirm purchases are saved to PostgreSQL database
- [ ] Database backup strategy in place
- [ ] Database migration scripts tested
- [ ] Order history migration from old system

## GHL Integration
- [ ] Test GHL webhook for purchase events
- [ ] Verify affiliate attribution tracking and GHL integration
- [ ] Verify GHL automations trigger correctly
- [ ] Confirm email addresses are saved to GHL contacts
- [ ] Test email deduplication (no duplicate contacts)
- [ ] Verify custom fields mapping (order value, product names, etc.)
- [ ] Test automation triggers:
  - [ ] New purchase
  - [ ] Abandoned cart
  - [ ] Post-purchase followup
- [ ] Ensure tags are applied correctly in GHL
- [ ] Test segment creation based on purchase behavior

## Analytics & Tracking
- [ ] Setup Google Tag Manager with GA4 and FB Pixel
- [ ] Configure UTM parameter tracking and attribution
- [ ] Test all conversion tracking pixels fire correctly
- [ ] Verify conversion events on success page with purchase values
- [ ] Setup error monitoring (Sentry, LogRocket, etc.)

## SEO & Schema Markup
- [ ] Implement Product schema markup (schema.org)
  - [ ] Price, availability, reviews, SKU, brand
- [ ] Implement VideoObject schema for product videos
- [ ] Organization Schema for brand trust signals
- [ ] BreadcrumbList Schema for site navigation
- [ ] WebSite Schema with SearchAction for sitelinks
- [ ] XML sitemap generation and submission
- [ ] Meta tags, OG tags preservation
- [ ] robots.txt configuration
- [ ] Configure 301 redirects from old store URLs
- [ ] Monitor 404s from old URLs post-launch

## YouTube Shopping / Google Merchant Center
- [ ] Create Google Merchant Center account
- [ ] Verify and claim website domain
- [ ] Upload product feed (XML/CSV) with:
  - [ ] GTIN/MPN/Brand identifiers
  - [ ] Accurate pricing and availability
  - [ ] Product images meeting Google's requirements
- [ ] Link Merchant Center to YouTube channel
- [ ] Enable Shopping ads in YouTube Studio
- [ ] Ensure channel meets requirements (1,000+ subscribers or Shopping Affiliate Program)

## Customer Experience
- [ ] Create and test success/thank you page
- [ ] Customer account login/registration migration
- [ ] Password reset functionality
- [ ] Cart abandonment recovery emails
- [ ] Email transactional service setup (order confirmations, receipts)

## Infrastructure & Technical
- [ ] SSL certificate and domain pointing/DNS configuration
- [ ] Environment variables (API keys, secrets) properly set
- [ ] Webhook retry logic/error handling for failed GHL sends
- [ ] Page load speed optimization
- [ ] Image optimization/CDN setup

## Legal & Compliance
- [ ] Privacy policy/terms updates with new domain
- [ ] GDPR compliance (if applicable)
- [ ] Cookie consent banner
- [ ] Refund/return policy pages

## Operations
- [ ] Inventory sync (if using inventory management)
- [ ] Shipping rates and tax calculations
- [ ] Customer support contact updates
- [ ] Admin dashboard access and training

## Post-Launch
- [ ] Monitor webhook delivery rates
- [ ] Customer feedback collection plan
- [ ] Rollback plan if critical issues arise
- [ ] Performance monitoring setup
- [ ] Review all analytics data flowing correctly

## Testing Checklist
- [ ] Full purchase flow test (browse → cart → checkout → confirmation)
- [ ] Test with different payment methods
- [ ] Test failed payment scenarios
- [ ] Test international orders (if applicable)
- [ ] Test coupon/discount codes
- [ ] Test affiliate link attribution
- [ ] Verify all emails are being sent
- [ ] Test on various devices and browsers

## Priority Order
1. Payment processing and database
2. GHL webhooks and data flow
3. 301 redirects (to not lose traffic)
4. Analytics tracking
5. Schema markup for SEO
6. YouTube Shopping setup
7. Polish and optimization