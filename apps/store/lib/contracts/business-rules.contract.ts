/**
 * Business Rules and Invariants Contracts
 *
 * Defines and enforces critical business rules that must always be true
 * These contracts prevent data corruption and ensure system consistency
 */

import { z } from 'zod';

// ============= Pricing Rules =============

/**
 * Ensures pricing consistency across the system
 */
export const PricingInvariantContract = z.object({
  basePrice: z.number().int().positive(),
  discountPercentage: z.number().min(0).max(100).optional(),
  finalPrice: z.number().int().positive(),
}).refine(
  (data) => {
    if (data.discountPercentage) {
      const expectedPrice = Math.round(data.basePrice * (1 - data.discountPercentage / 100));
      return data.finalPrice === expectedPrice;
    }
    return data.finalPrice === data.basePrice;
  },
  {
    message: 'Final price does not match calculated price after discount',
  }
);

/**
 * Validates refund amounts
 */
export const RefundInvariantContract = z.object({
  originalAmount: z.number().int().positive(),
  refundAmount: z.number().int().positive(),
  previousRefunds: z.number().int().min(0).default(0),
}).refine(
  (data) => data.refundAmount + data.previousRefunds <= data.originalAmount,
  {
    message: 'Total refunds cannot exceed original amount',
  }
);

// ============= Order State Invariants =============

/**
 * Ensures order state transitions are valid
 */
export const OrderStateInvariantContract = z.object({
  currentStatus: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded', 'canceled']),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']),
  fulfillmentStatus: z.enum(['pending', 'processing', 'shipped', 'delivered', 'returned']),
}).refine(
  (data) => {
    // Completed orders must have paid status
    if (data.currentStatus === 'completed' && data.paymentStatus !== 'paid') {
      return false;
    }
    // Refunded orders must have refunded payment
    if (data.currentStatus === 'refunded' && data.paymentStatus !== 'refunded') {
      return false;
    }
    // Cannot ship without payment
    if (data.fulfillmentStatus !== 'pending' && data.paymentStatus === 'pending') {
      return false;
    }
    return true;
  },
  {
    message: 'Invalid order state combination',
  }
);

// ============= Inventory Invariants =============

/**
 * Ensures inventory levels are consistent
 */
export const InventoryInvariantContract = z.object({
  totalStock: z.number().int().min(0),
  availableStock: z.number().int().min(0),
  reservedStock: z.number().int().min(0),
  soldStock: z.number().int().min(0),
}).refine(
  (data) => data.totalStock === data.availableStock + data.reservedStock + data.soldStock,
  {
    message: 'Stock levels do not balance',
  }
);

// ============= Customer Data Invariants =============

/**
 * Ensures customer data consistency
 */
export const CustomerInvariantContract = z.object({
  email: z.string().email(),
  emailVerified: z.boolean(),
  canMakePurchase: z.boolean(),
  accountStatus: z.enum(['active', 'suspended', 'deleted']),
}).refine(
  (data) => {
    // Suspended/deleted accounts cannot make purchases
    if (data.accountStatus !== 'active' && data.canMakePurchase) {
      return false;
    }
    // Some businesses might require email verification for purchases
    // Uncomment if needed:
    // if (!data.emailVerified && data.canMakePurchase) {
    //   return false;
    // }
    return true;
  },
  {
    message: 'Invalid customer state',
  }
);

// ============= Affiliate Commission Invariants =============

/**
 * Ensures affiliate commissions are calculated correctly
 */
export const AffiliateCommissionInvariantContract = z.object({
  saleAmount: z.number().int().positive(),
  commissionRate: z.number().min(0).max(1), // Percentage as decimal (0.1 = 10%)
  commissionAmount: z.number().int().min(0),
  isPaid: z.boolean(),
  paidAmount: z.number().int().min(0),
}).refine(
  (data) => {
    const expectedCommission = Math.floor(data.saleAmount * data.commissionRate);
    if (data.commissionAmount !== expectedCommission) {
      return false;
    }
    if (data.isPaid && data.paidAmount !== data.commissionAmount) {
      return false;
    }
    if (!data.isPaid && data.paidAmount > 0) {
      return false;
    }
    return true;
  },
  {
    message: 'Commission calculation or payment inconsistency',
  }
);

// ============= Data Consistency Rules =============

/**
 * Ensures database foreign key relationships are valid
 */
export const ForeignKeyInvariantContract = z.object({
  entity: z.enum(['order', 'payment', 'refund', 'customer']),
  id: z.string().uuid(),
  foreignKeys: z.array(z.object({
    table: z.string(),
    column: z.string(),
    value: z.string().uuid().nullable(),
    required: z.boolean(),
  })),
}).refine(
  (data) => {
    // All required foreign keys must have values
    return data.foreignKeys.every(fk => !fk.required || fk.value !== null);
  },
  {
    message: 'Required foreign key is null',
  }
);

/**
 * Ensures timestamps follow logical order
 */
export const TimestampInvariantContract = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
  paidAt: z.string().datetime().nullable().optional(),
  shippedAt: z.string().datetime().nullable().optional(),
  deliveredAt: z.string().datetime().nullable().optional(),
}).refine(
  (data) => {
    const created = new Date(data.createdAt).getTime();
    const updated = new Date(data.updatedAt).getTime();

    // Updated must be >= created
    if (updated < created) return false;

    // If deleted, must be >= updated
    if (data.deletedAt) {
      const deleted = new Date(data.deletedAt).getTime();
      if (deleted < updated) return false;
    }

    // If paid, must be >= created
    if (data.paidAt) {
      const paid = new Date(data.paidAt).getTime();
      if (paid < created) return false;
    }

    // If shipped, must be >= paid (if paid exists)
    if (data.shippedAt && data.paidAt) {
      const shipped = new Date(data.shippedAt).getTime();
      const paid = new Date(data.paidAt).getTime();
      if (shipped < paid) return false;
    }

    // If delivered, must be >= shipped
    if (data.deliveredAt && data.shippedAt) {
      const delivered = new Date(data.deliveredAt).getTime();
      const shipped = new Date(data.shippedAt).getTime();
      if (delivered < shipped) return false;
    }

    return true;
  },
  {
    message: 'Timestamps are not in logical order',
  }
);

// ============= Idempotency Invariants =============

/**
 * Ensures operations are idempotent
 */
export const IdempotencyInvariantContract = z.object({
  operationType: z.enum(['payment', 'refund', 'subscription']),
  idempotencyKey: z.string().min(1),
  attempts: z.array(z.object({
    timestamp: z.string().datetime(),
    result: z.enum(['success', 'failure', 'pending']),
    response: z.unknown(),
  })),
}).refine(
  (data) => {
    // Cannot have multiple successful attempts
    const successCount = data.attempts.filter(a => a.result === 'success').length;
    if (successCount > 1) return false;

    // All attempts after success should be ignored
    const successIndex = data.attempts.findIndex(a => a.result === 'success');
    if (successIndex !== -1) {
      const afterSuccess = data.attempts.slice(successIndex + 1);
      if (afterSuccess.some(a => a.result !== 'success')) {
        return false;
      }
    }

    return true;
  },
  {
    message: 'Idempotency violation detected',
  }
);

// ============= Business Rule Validators =============

/**
 * Validates that a refund request is valid
 */
export function validateRefundRequest(
  order: { amount: number; status: string; createdAt: Date },
  refundAmount: number,
  refundPolicy: { maxDays: number; maxPercentage: number }
): { valid: boolean; reason?: string } {
  // Check order status
  if (order.status !== 'completed') {
    return { valid: false, reason: 'Order is not completed' };
  }

  // Check refund window
  const daysSinceOrder = Math.floor(
    (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceOrder > refundPolicy.maxDays) {
    return { valid: false, reason: 'Refund window has expired' };
  }

  // Check refund amount
  const maxRefund = Math.floor(order.amount * refundPolicy.maxPercentage);
  if (refundAmount > maxRefund) {
    return { valid: false, reason: 'Refund amount exceeds maximum allowed' };
  }

  return { valid: true };
}

/**
 * Validates discount code application
 */
export function validateDiscountCode(
  code: string,
  discount: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    validFrom: Date;
    validTo: Date;
    usageLimit: number;
    usageCount: number;
    minimumAmount?: number;
  },
  orderAmount: number
): { valid: boolean; reason?: string; discountAmount?: number } {
  // Check code match
  if (code.toUpperCase() !== discount.code.toUpperCase()) {
    return { valid: false, reason: 'Invalid discount code' };
  }

  // Check validity period
  const now = Date.now();
  if (now < discount.validFrom.getTime() || now > discount.validTo.getTime()) {
    return { valid: false, reason: 'Discount code has expired' };
  }

  // Check usage limit
  if (discount.usageCount >= discount.usageLimit) {
    return { valid: false, reason: 'Discount code usage limit reached' };
  }

  // Check minimum amount
  if (discount.minimumAmount && orderAmount < discount.minimumAmount) {
    return { valid: false, reason: 'Order amount below minimum for discount' };
  }

  // Calculate discount amount
  const discountAmount = discount.type === 'percentage'
    ? Math.floor(orderAmount * discount.value / 100)
    : discount.value;

  return { valid: true, discountAmount };
}

/**
 * Validates subscription state changes
 */
export function validateSubscriptionChange(
  current: { status: string; plan: string; nextBillingDate: Date },
  requested: { action: 'upgrade' | 'downgrade' | 'cancel' | 'resume'; newPlan?: string }
): { valid: boolean; reason?: string } {
  switch (requested.action) {
    case 'upgrade':
      if (current.status !== 'active') {
        return { valid: false, reason: 'Can only upgrade active subscriptions' };
      }
      if (!requested.newPlan) {
        return { valid: false, reason: 'New plan required for upgrade' };
      }
      break;

    case 'downgrade':
      if (current.status !== 'active') {
        return { valid: false, reason: 'Can only downgrade active subscriptions' };
      }
      if (!requested.newPlan) {
        return { valid: false, reason: 'New plan required for downgrade' };
      }
      break;

    case 'cancel':
      if (current.status === 'canceled') {
        return { valid: false, reason: 'Subscription already canceled' };
      }
      break;

    case 'resume':
      if (current.status !== 'canceled') {
        return { valid: false, reason: 'Can only resume canceled subscriptions' };
      }
      if (current.nextBillingDate < new Date()) {
        return { valid: false, reason: 'Subscription has expired' };
      }
      break;
  }

  return { valid: true };
}