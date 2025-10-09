import logger from "@/lib/logger";

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
