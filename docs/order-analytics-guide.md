# Order Analytics and CRM Integration Guide

This guide demonstrates how to access and utilize the existing comprehensive order tracking and customer management capabilities in the SERP Templates store.

## Existing Order Analytics Endpoints

### 1. Health Monitoring
**Endpoint:** `GET /api/monitoring/health`

Monitor the overall health of the order processing system:
```bash
curl -H "Authorization: Bearer $MONITORING_TOKEN" \
  https://apps.serp.co/api/monitoring/health
```

**Response includes:**
- Pending checkout sessions
- Failed webhook processing
- Recent order counts
- System alerts

### 2. Order Analytics (New)
**Endpoint:** `GET /api/analytics/orders`

Get comprehensive order statistics and insights:
```bash
curl -H "Authorization: Bearer $MONITORING_TOKEN" \
  https://apps.serp.co/api/analytics/orders
```

**Response includes:**
- Total orders and revenue
- Average order value
- Daily and weekly order counts
- Top-performing products
- Payment method breakdown
- Recent order details

## Database Schema for Custom Queries

The system stores comprehensive order data in PostgreSQL:

### Orders Table
```sql
SELECT 
  id,
  customer_email,
  customer_name,
  amount_total,
  currency,
  offer_id,
  lander_id,
  payment_status,
  payment_method,
  source,
  metadata,
  created_at
FROM orders
WHERE payment_status = 'succeeded'
ORDER BY created_at DESC;
```

### Example Custom Analytics Queries

#### Revenue by Product
```sql
SELECT 
  offer_id,
  COUNT(*) as order_count,
  SUM(amount_total) / 100.0 as total_revenue,
  AVG(amount_total) / 100.0 as avg_order_value
FROM orders 
WHERE payment_status = 'succeeded' 
  AND offer_id IS NOT NULL
GROUP BY offer_id
ORDER BY total_revenue DESC;
```

#### Customer Purchase History
```sql
SELECT 
  customer_email,
  COUNT(*) as total_purchases,
  SUM(amount_total) / 100.0 as lifetime_value,
  MIN(created_at) as first_purchase,
  MAX(created_at) as last_purchase
FROM orders
WHERE payment_status = 'succeeded'
GROUP BY customer_email
ORDER BY lifetime_value DESC;
```

#### Daily Revenue Trends
```sql
SELECT 
  DATE(created_at) as order_date,
  COUNT(*) as orders,
  SUM(amount_total) / 100.0 as revenue
FROM orders
WHERE payment_status = 'succeeded'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY order_date DESC;
```

## GoHighLevel CRM Integration

### Automatic Customer Sync
Every successful order triggers:
1. **Contact creation/update** in GHL
2. **License key assignment** via custom fields
3. **Workflow trigger** for product-specific automation
4. **Pipeline stage update** based on purchase

### Available GHL Data Points
- **Customer Profile:** Name, email, phone
- **Purchase History:** All orders with metadata
- **Product Access:** License keys for each product
- **Affiliate Tracking:** Referral source and ID
- **Support Tickets:** Integrated ticket system
- **Engagement:** Email open/click tracking

### GHL Workflows Already Configured
- `New Purchase WELCOME Flow`: Onboarding sequence
- Product-specific flows for each offer
- Support ticket automation
- Newsletter engagement sequences
- Affiliate program management

## Stripe Dashboard Analytics

For payment-specific analytics, the Stripe Dashboard provides:
- **Revenue Reports:** Detailed financial analytics
- **Payment Success Rates:** Conversion tracking
- **Chargeback Management:** Dispute handling
- **Customer Payment Methods:** Saved cards, PayPal, etc.
- **Subscription Analytics:** If recurring billing is used

Access at: https://dashboard.stripe.com/reports

## PayPal Analytics

For PayPal transactions, access analytics at:
- PayPal Business Dashboard
- Transaction reports
- Dispute management
- International payment tracking

## Building Custom Dashboards

### Option 1: Database Connection
Connect business intelligence tools directly to PostgreSQL:
- **Metabase**: Open-source dashboard builder
- **Grafana**: Real-time monitoring dashboards
- **Tableau**: Enterprise analytics platform

### Option 2: API-Based Dashboards
Use the existing API endpoints to build custom dashboards:
- React/Next.js dashboard using `/api/analytics/orders`
- Scheduled reports using the monitoring endpoints
- Integration with existing business tools

### Option 3: Enhanced GHL Reporting
Utilize GoHighLevel's built-in reporting:
- Custom field reporting
- Pipeline analytics
- Contact lifecycle reports
- Workflow performance metrics

## Best Practices

### For Order Management
1. **Use existing monitoring endpoints** for operational alerts
2. **Leverage GHL workflows** for customer communication
3. **Monitor Stripe Dashboard** for payment issues
4. **Set up regular database backups** for order data

### For Customer Support
1. **Use GHL ticket system** for support requests
2. **Access customer purchase history** via GHL contact records
3. **Utilize license key custom fields** for product access
4. **Trigger support workflows** automatically

### For Analytics and Reporting
1. **Start with existing endpoints** before building custom solutions
2. **Use Stripe Dashboard** for financial reporting
3. **Leverage GHL contact reports** for customer insights
4. **Create custom SQL queries** for specific business questions

## Migration Path (If Needed)

If specific functionality requires enhancement:

1. **Enhance existing system first**
   - Add custom fields to GHL
   - Create new API endpoints
   - Build custom dashboard using existing data

2. **Integrate complementary tools**
   - Analytics: Google Analytics Enhanced Ecommerce
   - Support: Intercom or Zendesk (if GHL insufficient)
   - Marketing: Klaviyo or ConvertKit (if GHL workflows insufficient)

3. **Only as last resort: Replace components**
   - Consider specialized tools only if existing system cannot be enhanced
   - Ensure data migration plan before switching
   - Maintain backward compatibility during transition

## Conclusion

The existing system provides enterprise-grade order management and customer relationship capabilities that exceed most dedicated ecommerce CRMs. Focus on leveraging and optimizing the current stack rather than adding complexity with additional systems.

**Key Success Factors:**
- ✅ Comprehensive order tracking via PostgreSQL
- ✅ Customer management via GoHighLevel CRM
- ✅ Payment processing via Stripe + PayPal
- ✅ Operational monitoring via custom endpoints
- ✅ Marketing automation via GHL workflows

This infrastructure supports scaling to hundreds of thousands of orders while maintaining data integrity and customer relationship quality.