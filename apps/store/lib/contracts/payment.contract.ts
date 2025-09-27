/**
 * Payment Processing Contracts
 *
 * Ensures payment data integrity across Stripe, PayPal, and internal systems
 */

import { z } from 'zod';

// ============= Payment Method Contracts =============

export const PaymentMethodContract = z.enum(['card', 'paypal', 'bank_transfer', 'crypto']);
export type PaymentMethod = z.infer<typeof PaymentMethodContract>;

// ============= Money Contracts =============

/**
 * Represents monetary amounts in smallest currency unit (cents)
 * E.g., $79.99 = 7999
 */
export const MoneyAmountContract = z.object({
  amount: z.number().int().min(0),
  currency: z.string().length(3).toLowerCase(),
  formatted: z.string().optional(), // "$79.99"
});

export type MoneyAmount = z.infer<typeof MoneyAmountContract>;

// ============= Stripe-specific Contracts =============

export const StripeCustomerContract = z.object({
  id: z.string().startsWith('cus_'),
  email: z.string().email(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  metadata: z.record(z.string()).default({}),
});

export const StripeSubscriptionContract = z.object({
  id: z.string().startsWith('sub_'),
  customer: z.string().startsWith('cus_'),
  status: z.enum(['trialing', 'active', 'past_due', 'canceled', 'unpaid']),
  current_period_start: z.number(),
  current_period_end: z.number(),
  items: z.array(z.object({
    price: z.string().startsWith('price_'),
    quantity: z.number().int().min(1),
  })),
});

export const StripeChargeContract = z.object({
  id: z.string().startsWith('ch_'),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  customer: z.string().startsWith('cus_').nullable(),
  description: z.string().nullable(),
  paid: z.boolean(),
  refunded: z.boolean(),
  status: z.enum(['succeeded', 'pending', 'failed']),
});

// ============= PayPal-specific Contracts =============

export const PayPalOrderContract = z.object({
  id: z.string(),
  status: z.enum(['CREATED', 'SAVED', 'APPROVED', 'VOIDED', 'COMPLETED']),
  intent: z.enum(['CAPTURE', 'AUTHORIZE']),
  purchase_units: z.array(z.object({
    reference_id: z.string(),
    amount: z.object({
      currency_code: z.string().length(3),
      value: z.string(), // "79.99"
    }),
  })),
  payer: z.object({
    email_address: z.string().email(),
    name: z.object({
      given_name: z.string().optional(),
      surname: z.string().optional(),
    }).optional(),
  }).optional(),
});

export const PayPalCaptureContract = z.object({
  id: z.string(),
  status: z.enum(['COMPLETED', 'DECLINED', 'PARTIALLY_REFUNDED', 'PENDING', 'REFUNDED']),
  amount: z.object({
    currency_code: z.string().length(3),
    value: z.string(),
  }),
});

// ============= Unified Payment Contracts =============

export const UnifiedPaymentEventContract = z.object({
  provider: z.enum(['stripe', 'paypal']),
  eventType: z.enum(['payment.created', 'payment.succeeded', 'payment.failed', 'payment.refunded']),
  paymentId: z.string(),
  customerId: z.string().nullable(),
  amount: MoneyAmountContract,
  metadata: z.record(z.unknown()).default({}),
  timestamp: z.string().datetime(),
});

export type UnifiedPaymentEvent = z.infer<typeof UnifiedPaymentEventContract>;

// ============= Payment State Machine =============

export const PaymentStatusContract = z.enum([
  'pending',
  'processing',
  'succeeded',
  'failed',
  'canceled',
  'refunded',
  'partially_refunded',
]);

export type PaymentStatus = z.infer<typeof PaymentStatusContract>;

export const PaymentStateTransitionContract = z.object({
  from: PaymentStatusContract,
  to: PaymentStatusContract,
  reason: z.string().optional(),
  timestamp: z.string().datetime(),
  actor: z.enum(['system', 'customer', 'admin', 'webhook']),
});

export type PaymentStateTransition = z.infer<typeof PaymentStateTransitionContract>;

// ============= Validation Functions =============

/**
 * Validates Stripe webhook payload
 */
export function validateStripePayment(data: unknown): {
  isValid: boolean;
  errors?: string[];
  parsed?: any;
} {
  try {
    const result = StripeChargeContract.parse(data);
    return { isValid: true, parsed: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { isValid: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Validates PayPal webhook payload
 */
export function validatePayPalPayment(data: unknown): {
  isValid: boolean;
  errors?: string[];
  parsed?: any;
} {
  try {
    const result = PayPalOrderContract.parse(data);
    return { isValid: true, parsed: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { isValid: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Validates payment state transitions
 */
export function validatePaymentTransition(
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus
): boolean {
  const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
    pending: ['processing', 'succeeded', 'failed', 'canceled'],
    processing: ['succeeded', 'failed', 'canceled'],
    succeeded: ['refunded', 'partially_refunded'],
    failed: ['pending'], // Allow retry
    canceled: [],
    refunded: [],
    partially_refunded: ['refunded'],
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Formats money amount for display
 */
export function formatMoney(amount: MoneyAmount): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: amount.currency.toUpperCase(),
  }).format(amount.amount / 100);
}

/**
 * Converts between Stripe and PayPal amount formats
 */
export function convertPaymentAmount(
  amount: number | string,
  from: 'stripe' | 'paypal'
): MoneyAmount {
  if (from === 'stripe') {
    return {
      amount: typeof amount === 'number' ? amount : parseInt(amount, 10),
      currency: 'usd', // Default, should be passed separately
    };
  } else {
    // PayPal uses decimal strings like "79.99"
    const cents = Math.round(parseFloat(amount.toString()) * 100);
    return {
      amount: cents,
      currency: 'usd',
    };
  }
}