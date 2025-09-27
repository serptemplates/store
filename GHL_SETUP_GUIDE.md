# GoHighLevel Integration Setup Guide

- [ ] everything on our site is performant (98+) lighthouse
- [ ] mobile responsive
- [ ] other performance checks
- [ ] seo meta stuff optimized
- [ ] xml sitemap

## 1. Environment Variables

Add these to your `.env` file:

```bash
# Required
GHL_PAT_LOCATION=your_personal_access_token_here
GHL_LOCATION_ID=your_location_id_here
GHL_API_BASE_URL=https://services.leadconnectorhq.com

# Optional - for tracking affiliate IDs
GHL_AFFILIATE_FIELD_ID=your_custom_field_id_for_affiliates
```

## 2. Product YAML Configuration

Add a `ghl` section to your product YAML files to enable GoHighLevel sync:

### Basic Configuration (Contact Only)
```yaml
ghl:
  # Tags to apply to the contact
  tag_ids:
    - "tag_id_for_purchased"
    - "tag_id_for_product_name"

  # Source for tracking where the contact came from
  source: "Store Purchase"
```

### Full Configuration (Contact + Opportunity)
```yaml
ghl:
  # Pipeline and stage for creating opportunities
  pipeline_id: "GYbj73q9z3SGihxNlOne"  # Your pipeline ID
  stage_id: "8b813665-bcdd-4636-bc65-d8f79d3743cb"  # Your stage ID

  # Opportunity configuration
  status: "open"
  source: "Store Purchase"

  # Template for opportunity name (variables available: offerName, customerEmail, etc)
  opportunity_name_template: "{{offerName}} - {{customerEmail}}"

  # Tags to apply
  tag_ids:
    - "purchased"
    - "store-customer"

  # Workflows to trigger after contact creation
  workflow_ids:
    - "workflow_id_for_welcome_email"
    - "workflow_id_for_onboarding"

  # Custom field mappings for contact
  contact_custom_field_ids:
    productName: "field_id_for_product_name"
    stripeSessionId: "field_id_for_stripe_session"
    affiliateId: "field_id_for_affiliate"

  # Custom field mappings for opportunity
  opportunity_custom_field_ids:
    amountPaid: "field_id_for_amount"
    purchaseDate: "field_id_for_date"
```

## 3. Available Variables for Templates and Custom Fields

These variables are available for use in templates and custom field mappings:

- `offerId` - Product slug/ID
- `offerName` - Product name
- `customerEmail` - Customer's email
- `customerName` - Customer's full name
- `firstName` - Customer's first name
- `lastName` - Customer's last name
- `customerPhone` - Customer's phone (if provided)
- `stripeSessionId` - Stripe checkout session ID
- `stripePaymentIntentId` - Stripe payment intent ID
- `amountTotal` - Total amount in cents
- `amountDecimal` - Total amount as decimal (e.g., 99.99)
- `amountFormatted` - Formatted amount (e.g., "$99.99")
- `currency` - Currency code (e.g., "USD")
- `landerId` - Landing page ID (if different from offer ID)
- `affiliateId` - Affiliate ID from URL params (?aff=xxx)

## 4. Finding Your GoHighLevel IDs

### Pipeline and Stage IDs
1. Use the provided `ghl-crm-config.json` file which contains all pipelines and stages
2. Or fetch them via API:
```bash
curl -X GET "https://services.leadconnectorhq.com/opportunities/pipelines" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -H "Version: 2021-07-28"
```

### Custom Field IDs
Fetch custom fields for your location:
```bash
curl -X GET "https://services.leadconnectorhq.com/locations/YOUR_LOCATION_ID/customFields" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -H "Version: 2021-07-28"
```

### Tag IDs
Fetch available tags:
```bash
curl -X GET "https://services.leadconnectorhq.com/tags" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -H "Version: 2021-07-28" \
  -H "Content-Type: application/json"
```

## 5. Testing the Integration

1. Make a test purchase using Stripe test mode
2. Check the webhook logs in the database
3. Verify contact creation in GoHighLevel
4. Confirm opportunity creation (if configured)

## 6. Monitoring

The system includes:
- Automatic retry logic (3 attempts with exponential backoff)
- Error logging to webhook_logs table
- Slack alerts after 3 failed attempts (if configured)
- GHL sync status stored in checkout session metadata

## 7. Common Issues

### Contact created but no opportunity
- Check that both `pipeline_id` and `stage_id` are configured
- Verify the pipeline and stage IDs are valid

### Webhook processed but no GHL sync
- Check GHL credentials are configured
- Verify customer email is present
- Check webhook_logs table for errors

### Affiliate ID not tracked
- Ensure `GHL_AFFILIATE_FIELD_ID` is set in environment
- URL must include `?aff=xxx` or `?affiliate=xxx` parameter
- add one of those "social proof soandso just bought" things