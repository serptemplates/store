# Email Notifications Setup Guide

## Current Status: ⚠️ Not Implemented

Email notifications are not currently implemented in the store. Purchase confirmations are handled through:
1. **Stripe**: Sends receipt emails automatically
2. **GHL**: Can trigger email automations based on contact creation/tags
3. **Success Page**: Shows order confirmation to customer

## Implementation Options

### Option 1: Resend (Recommended)
Modern email API with great Next.js integration.

```bash
npm install resend
```

```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOrderConfirmation(order: Order) {
  await resend.emails.send({
    from: 'Store <orders@yourdomain.com>',
    to: order.customer_email,
    subject: 'Order Confirmation',
    html: generateOrderEmail(order),
  });
}
```

### Option 2: SendGrid
Popular email service with robust features.

```bash
npm install @sendgrid/mail
```

```typescript
// lib/email.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendOrderConfirmation(order: Order) {
  await sgMail.send({
    to: order.customer_email,
    from: 'orders@yourdomain.com',
    subject: 'Order Confirmation',
    html: generateOrderEmail(order),
  });
}
```

### Option 3: Postmark
Reliable transactional email service.

```bash
npm install postmark
```

```typescript
// lib/email.ts
import * as postmark from 'postmark';

const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

export async function sendOrderConfirmation(order: Order) {
  await client.sendEmail({
    From: 'orders@yourdomain.com',
    To: order.customer_email,
    Subject: 'Order Confirmation',
    HtmlBody: generateOrderEmail(order),
  });
}
```

## Email Templates Needed

### 1. Order Confirmation
- Sent immediately after successful payment
- Includes: Order ID, products, amount, download links

### 2. Payment Failed
- Sent when payment fails
- Includes: Retry link, support contact

### 3. Abandoned Cart (Optional)
- Sent after checkout session expires
- Includes: Cart recovery link

## Implementation Steps

### 1. Choose Email Service
```bash
# Add to .env
RESEND_API_KEY=re_xxxxx  # or
SENDGRID_API_KEY=SG.xxxxx  # or
POSTMARK_API_KEY=xxxxx
```

### 2. Create Email Library
```typescript
// lib/email.ts
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions) {
  // Implementation based on chosen service
}

export async function sendOrderConfirmation(order: any) {
  const html = await generateOrderEmail(order);
  await sendEmail({
    to: order.customer_email,
    subject: `Order Confirmation #${order.id}`,
    html,
  });
}
```

### 3. Create Email Templates
```typescript
// lib/email-templates.tsx
export function OrderConfirmationEmail({ order }: { order: Order }) {
  return (
    <html>
      <body>
        <h1>Thank you for your order!</h1>
        <p>Order ID: {order.id}</p>
        <p>Amount: {order.amount_total}</p>
        // ... rest of template
      </body>
    </html>
  );
}
```

### 4. Integrate with Webhook
```typescript
// app/api/stripe/webhook/route.ts
import { sendOrderConfirmation } from '@/lib/email';

// In the webhook handler after successful payment:
await sendOrderConfirmation(order);
```

## Testing Email Delivery

### Development Testing
Use email testing services:
- **Mailtrap**: Catches emails in development
- **Ethereal**: Temporary test email accounts

### Production Testing
1. Send test order
2. Verify email delivery
3. Check spam folders
4. Monitor bounce rates

## Email Best Practices

### Domain Setup
```bash
# Required DNS records:
□ SPF record: v=spf1 include:_spf.resend.com ~all
□ DKIM records: As provided by email service
□ DMARC record: v=DMARC1; p=none;
```

### Content Guidelines
- Clear subject lines
- Responsive HTML templates
- Plain text alternatives
- Unsubscribe links (if marketing)
- Company contact info

### Rate Limiting
- Implement retry logic
- Queue for bulk sends
- Monitor sending limits

## Monitoring

### Key Metrics
- Delivery rate > 99%
- Open rate (transactional) > 80%
- Bounce rate < 2%
- Complaint rate < 0.1%

### Error Handling
```typescript
try {
  await sendEmail(options);
} catch (error) {
  console.error('Email send failed:', error);
  // Log to monitoring service
  // Queue for retry
}
```

## Current Workaround

Since email is not implemented, ensure:

1. **Stripe Receipt Emails**: Enabled in Stripe Dashboard
   - Dashboard → Settings → Customer emails
   - Enable "Successful payments"

2. **GHL Automations**: Configure in GHL
   - Create workflow triggered by tag
   - Send confirmation email from GHL

3. **Success Page**: Shows all order details
   - Customer can print/save page
   - Include support contact

## Priority Level: Medium

Email notifications are nice-to-have but not critical because:
- Stripe sends receipts automatically
- Success page shows confirmation
- GHL can handle email automation

Implement when you need:
- Custom branded emails
- Additional transactional emails
- Better control over email content
- Email analytics and tracking

---

*Note: The store is fully functional without custom email implementation due to Stripe's built-in receipts and the success page confirmation.*