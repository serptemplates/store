/**
 * Webhook Data Contracts
 *
 * Validates and types webhook payloads from:
 * - Stripe webhooks
 * - PayPal webhooks
 * - GHL webhooks (if any)
 */

import { z } from 'zod';

// ============= Stripe Webhook Contracts =============

// Stripe Customer Details
export const StripeCustomerDetailsContract = z.object({
  email: z.string().email().nullable(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.object({
    city: z.string().nullable(),
    country: z.string().nullable(),
    line1: z.string().nullable(),
    line2: z.string().nullable(),
    postal_code: z.string().nullable(),
    state: z.string().nullable(),
  }).nullable(),
});

// Stripe Checkout Session Completed
export const StripeCheckoutSessionCompletedContract = z.object({
  id: z.string().startsWith('cs_'),
  object: z.literal('checkout.session'),
  amount_subtotal: z.number().nullable(),
  amount_total: z.number().nullable(),
  currency: z.string().nullable(),
  customer: z.string().nullable(),
  customer_details: StripeCustomerDetailsContract.nullable(),
  customer_email: z.string().email().nullable(),
  line_items: z.object({
    object: z.literal('list'),
    data: z.array(z.object({
      id: z.string(),
      amount_subtotal: z.number(),
      amount_total: z.number(),
      currency: z.string(),
      description: z.string().nullable(),
      price: z.object({
        id: z.string(),
        product: z.string(),
        unit_amount: z.number(),
      }),
      quantity: z.number(),
    })),
  }).optional(),
  metadata: z.record(z.string()),
  mode: z.enum(['payment', 'subscription', 'setup']),
  payment_intent: z.union([
    z.string().startsWith('pi_'),
    z.object({
      id: z.string().startsWith('pi_'),
      amount: z.number(),
      currency: z.string(),
      status: z.string(),
    }),
  ]).nullable(),
  payment_status: z.string(),
  status: z.string(),
  subscription: z.string().nullable(),
  success_url: z.string().nullable(),
  cancel_url: z.string().nullable(),
});

export type StripeCheckoutSessionCompleted = z.infer<typeof StripeCheckoutSessionCompletedContract>;

// Stripe Payment Intent
export const StripePaymentIntentContract = z.object({
  id: z.string().startsWith('pi_'),
  object: z.literal('payment_intent'),
  amount: z.number(),
  amount_capturable: z.number(),
  amount_received: z.number(),
  currency: z.string(),
  customer: z.string().nullable(),
  description: z.string().nullable(),
  latest_charge: z.union([
    z.string().startsWith('ch_'),
    z.object({
      id: z.string().startsWith('ch_'),
      amount: z.number(),
      currency: z.string(),
      status: z.string(),
    }),
  ]).nullable(),
  metadata: z.record(z.string()),
  receipt_email: z.string().email().nullable(),
  status: z.string(),
  last_payment_error: z.object({
    message: z.string(),
    type: z.string(),
  }).nullable(),
});

export type StripePaymentIntent = z.infer<typeof StripePaymentIntentContract>;

// Stripe Webhook Event
export const StripeWebhookEventContract = z.object({
  id: z.string().startsWith('evt_'),
  object: z.literal('event'),
  api_version: z.string().nullable(),
  created: z.number(),
  type: z.string(),
  data: z.object({
    object: z.unknown(),
    previous_attributes: z.record(z.unknown()).optional(),
  }),
  livemode: z.boolean(),
  pending_webhooks: z.number(),
  request: z.object({
    id: z.string().nullable(),
    idempotency_key: z.string().nullable(),
  }).nullable(),
});

export type StripeWebhookEvent = z.infer<typeof StripeWebhookEventContract>;

// ============= PayPal Webhook Contracts =============

export const PayPalOrderContract = z.object({
  id: z.string(),
  status: z.enum(['CREATED', 'SAVED', 'APPROVED', 'VOIDED', 'COMPLETED']),
  intent: z.enum(['CAPTURE', 'AUTHORIZE']),
  purchase_units: z.array(z.object({
    reference_id: z.string().optional(),
    amount: z.object({
      currency_code: z.string(),
      value: z.string(),
    }),
    payee: z.object({
      email_address: z.string().email().optional(),
      merchant_id: z.string().optional(),
    }).optional(),
    description: z.string().optional(),
    custom_id: z.string().optional(),
    invoice_id: z.string().optional(),
  })),
  payer: z.object({
    name: z.object({
      given_name: z.string().optional(),
      surname: z.string().optional(),
    }).optional(),
    email_address: z.string().email().optional(),
    payer_id: z.string().optional(),
    address: z.object({
      country_code: z.string(),
    }).optional(),
  }).optional(),
  create_time: z.string(),
  update_time: z.string(),
  links: z.array(z.object({
    href: z.string().url(),
    rel: z.string(),
    method: z.enum(['GET', 'POST', 'PATCH', 'DELETE']).optional(),
  })),
});

export type PayPalOrder = z.infer<typeof PayPalOrderContract>;

export const PayPalWebhookEventContract = z.object({
  id: z.string(),
  event_version: z.string(),
  create_time: z.string(),
  resource_type: z.string(),
  resource_version: z.string().optional(),
  event_type: z.string(),
  summary: z.string().optional(),
  resource: z.unknown(),
  links: z.array(z.object({
    href: z.string().url(),
    rel: z.string(),
    method: z.string().optional(),
  })),
});

export type PayPalWebhookEvent = z.infer<typeof PayPalWebhookEventContract>;

// ============= Webhook Log Contract =============

export const WebhookLogContract = z.object({
  id: z.string().uuid(),
  paymentIntentId: z.string().nullable(),
  stripeSessionId: z.string().nullable(),
  eventType: z.string(),
  offerId: z.string().nullable(),
  landerId: z.string().nullable(),
  status: z.enum(['success', 'error', 'pending']),
  message: z.string().nullable(),
  metadata: z.record(z.unknown()),
  attempts: z.number().int().default(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WebhookLog = z.infer<typeof WebhookLogContract>;

// ============= Validation Functions =============

/**
 * Validates Stripe checkout.session.completed webhook
 */
export function validateStripeCheckoutSession(data: unknown): StripeCheckoutSessionCompleted {
  return StripeCheckoutSessionCompletedContract.parse(data);
}

/**
 * Validates Stripe payment_intent webhook
 */
export function validateStripePaymentIntent(data: unknown): StripePaymentIntent {
  return StripePaymentIntentContract.parse(data);
}

/**
 * Validates Stripe webhook event
 */
export function validateStripeWebhookEvent(data: unknown): StripeWebhookEvent {
  const event = StripeWebhookEventContract.parse(data);

  // Additional validation based on event type
  switch (event.type) {
    case 'checkout.session.completed':
      event.data.object = validateStripeCheckoutSession(event.data.object);
      break;
    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
      event.data.object = validateStripePaymentIntent(event.data.object);
      break;
  }

  return event;
}

/**
 * Validates PayPal order
 */
export function validatePayPalOrder(data: unknown): PayPalOrder {
  return PayPalOrderContract.parse(data);
}

/**
 * Validates PayPal webhook event
 */
export function validatePayPalWebhookEvent(data: unknown): PayPalWebhookEvent {
  return PayPalWebhookEventContract.parse(data);
}

/**
 * Type guard for Stripe webhook events
 */
export function isStripeWebhookEvent(event: unknown): event is StripeWebhookEvent {
  try {
    StripeWebhookEventContract.parse(event);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for PayPal webhook events
 */
export function isPayPalWebhookEvent(event: unknown): event is PayPalWebhookEvent {
  try {
    PayPalWebhookEventContract.parse(event);
    return true;
  } catch {
    return false;
  }
}