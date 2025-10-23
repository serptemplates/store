/**
 * Critical Path Contract Tests
 *
 * Tests all critical data paths to ensure contracts are enforced
 * These tests prevent regression and ensure data integrity
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';

// Import all contracts
import {
  validateCheckoutSession,
  validateCheckoutRequest,
  validateOrder,
  hasGHLSyncData,
  extractGHLSyncMetadata,
  CheckoutSessionContract,
  OrderContract,
} from './checkout.contract';

import {
  validateStripeCheckoutSession,
  validateStripePaymentIntent,
  validateStripeWebhookEvent,
  isStripeWebhookEvent,
} from './webhook.contract';
import type { StripeCheckoutSessionCompleted } from './webhook.contract';

import {
  validateGHLConfig,
  validateGHLContact,
  validateGHLSyncRequest,
  formatGHLCustomerName,
  buildOpportunityName,
} from './ghl.contract';

import {
  validateDBInsertCheckoutSession,
  validateDBInsertOrder,
  dbToCamelCase,
  camelToSnakeCase,
} from './database.contract';

import {
  validateStripePayment,
  validatePaymentTransition,
  formatMoney,
  PaymentStatusContract,
} from './payment.contract';

import {
  validateGA4Purchase,
  buildGA4PurchaseEvent,
  buildGTMPurchaseEvent,
} from './analytics.contract';

import {
  PricingInvariantContract,
  RefundInvariantContract,
  OrderStateInvariantContract,
  TimestampInvariantContract,
  validateRefundRequest,
  validateDiscountCode,
} from './business-rules.contract';
import {
  buildOrderFixture,
  buildStripeCheckoutSessionFixture,
  buildStripePaymentIntentFixture,
  buildStripeWebhookEventFixture,
} from './test-fixtures';

describe('Critical Path: Checkout to Payment', () => {
  it('should validate complete checkout flow', () => {
    // Step 1: Checkout request
    const checkoutRequest = {
      offerId: 'test-product',
      quantity: 1,
      customer: {
        email: 'test@example.com',
        name: 'Test User',
      },
      affiliateId: 'AFF123',
      metadata: {
        source: 'landing-page',
      },
    };

    const validatedRequest = validateCheckoutRequest(checkoutRequest);
    expect(validatedRequest.offerId).toBe('test-product');
    expect(validatedRequest.customer?.email).toBe('test@example.com');

    // Step 2: Create Stripe session
    const stripeSession = buildStripeCheckoutSessionFixture({
      id: 'cs_test_flow',
      metadata: {
        offerId: 'test-product',
        affiliateId: 'AFF123',
      },
      payment_intent: 'pi_test_flow',
    });

    const validatedSession = validateStripeCheckoutSession(stripeSession);
    expect(validatedSession.id).toBe('cs_test_flow');

    // Step 3: Validate payment intent
    const paymentIntent = buildStripePaymentIntentFixture({
      id: 'pi_test_flow',
      customer: 'cus_test_flow',
    });
    const validatedIntent = validateStripePaymentIntent(paymentIntent);
    expect(validatedIntent.id).toBe('pi_test_flow');

    // Step 4: Database insert
    const dbInsert = {
      stripe_session_id: stripeSession.id,
      offer_id: checkoutRequest.offerId,
      customer_email: checkoutRequest.customer?.email,
      status: 'pending',
      source: 'stripe',
    };

    const validatedInsert = validateDBInsertCheckoutSession(dbInsert);
    expect(validatedInsert.stripe_session_id).toBe('cs_test_flow');

    // Step 5: Payment transition
    const isValidTransition = validatePaymentTransition('pending', 'processing');
    expect(isValidTransition).toBe(true);

    const isInvalidTransition = validatePaymentTransition('succeeded', 'pending');
    expect(isInvalidTransition).toBe(false);
  });

  it('should validate webhook to order creation flow', () => {
    // Step 1: Webhook event
    const webhookEvent = buildStripeWebhookEventFixture({}, {
      id: 'cs_test_flow',
      payment_intent: 'pi_test_flow',
      metadata: {
        offerId: 'test-product',
      },
    });

    expect(isStripeWebhookEvent(webhookEvent)).toBe(true);
    const validatedEvent = validateStripeWebhookEvent(webhookEvent);
    expect(validatedEvent.type).toBe('checkout.session.completed');
    const session = validatedEvent.data.object as StripeCheckoutSessionCompleted;

    // Step 2: Create order
    const order = buildOrderFixture({
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? 'pi_test_flow',
      offerId: session.metadata.offerId,
      amountTotal: session.amount_total ?? 7900,
      currency: session.currency ?? 'usd',
      metadata: {},
    });

    const validatedOrder = validateOrder(order);
    expect(validatedOrder.stripeSessionId).toBe('cs_test_flow');

    // Step 3: Database insert
    const dbOrder = camelToSnakeCase({
      stripeSessionId: order.stripeSessionId,
      stripePaymentIntentId: order.stripePaymentIntentId,
      customerEmail: order.customerEmail,
      amountTotal: order.amountTotal,
      currency: order.currency,
      paymentStatus: order.paymentStatus,
      source: 'stripe',
    });

    const validatedDbOrder = validateDBInsertOrder(dbOrder);
    expect(validatedDbOrder.stripe_session_id).toBe(order.stripeSessionId);
  });
});

describe('Critical Path: GHL Sync', () => {
  it('should validate GHL sync flow', () => {
    // Step 1: Build GHL contact
    const nowIso = new Date().toISOString();
    const contact = {
      id: 'contact_123',
      locationId: 'location_123',
      email: 'test@example.com',
      phone: '+1234567890',
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      dateOfBirth: null,
      address1: null,
      city: null,
      state: null,
      country: null,
      postalCode: null,
      companyName: null,
      website: null,
      tags: ['customer', 'premium'],
      source: 'website',
      customFields: {},
      dateAdded: nowIso,
      dateUpdated: nowIso,
    };

    const validatedContact = validateGHLContact(contact);
    expect(validatedContact.email).toBe('test@example.com');

    // Step 2: Build sync request
    const syncRequest = {
      amountTotal: 7900,
      currency: 'USD',
      customerEmail: 'test@example.com',
      customerName: 'Test User',
      offerId: 'test-offer',
      paymentIntentId: 'pi_123',
      sessionId: 'cs_123',
      ghl: {
        pipelineId: 'pipeline_123',
        stageId: 'stage_new',
        status: 'open',
      },
    };

    const validatedSync = validateGHLSyncRequest(syncRequest);
    expect(validatedSync.ghl.status).toBe('open');

    // Step 3: Check sync metadata
    const metadata = {
      ghlSyncedAt: new Date().toISOString(),
      ghlContactId: 'contact_123',
      ghlOpportunityId: 'opp_123',
    };

    expect(hasGHLSyncData(metadata)).toBe(true);
    const extracted = extractGHLSyncMetadata(metadata);
    expect(extracted.ghlContactId).toBe('contact_123');
  });

  it('should format customer names correctly', () => {
    expect(formatGHLCustomerName('John Doe')).toEqual({
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(formatGHLCustomerName('John')).toEqual({
      firstName: 'John',
    });

    expect(formatGHLCustomerName('John Middle Doe')).toEqual({
      firstName: 'John',
      lastName: 'Middle Doe',
    });
  });

  it('should build opportunity names correctly', () => {
    const template = '{name} - {product} - {amount}';
    const data = {
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      offerId: 'video-downloader',
      amount: 7900,
      currency: 'usd',
    };

    const name = buildOpportunityName(template, data);
    expect(name).toBe('John Doe - video-downloader - USD 79.00');
  });
});

describe('Critical Path: Analytics Tracking', () => {
  it('should build valid GA4 purchase event', () => {
    const order = {
      id: 'order_123',
      amount: 7900,
      currency: 'usd',
      items: [
        { id: 'prod_1', name: 'Product 1', price: 7900, quantity: 1 },
      ],
      affiliateId: 'AFF123',
    };

    const ga4Event = buildGA4PurchaseEvent(order);
    expect(ga4Event.transaction_id).toBe('order_123');
    expect(ga4Event.value).toBe(79); // Converted to dollars
    expect(ga4Event.currency).toBe('USD');
    expect(ga4Event.affiliation).toBe('AFF123');

    const validation = validateGA4Purchase(ga4Event);
    expect(validation.isValid).toBe(true);
  });

  it('should build valid GTM data layer event', () => {
    const order = {
      id: 'order_123',
      amount: 7900,
      currency: 'usd',
      email: 'test@example.com',
      items: [
        { id: 'prod_1', name: 'Product 1', price: 7900 },
      ],
    };

    const gtmEvent = buildGTMPurchaseEvent(order);
    expect(gtmEvent.event).toBe('purchase');
    expect(gtmEvent.ecommerce?.transaction_id).toBe('order_123');
    expect(gtmEvent.ecommerce?.value).toBe(79);
    expect(gtmEvent.user_data?.email).toBe('test@example.com');
  });
});

describe('Critical Path: Business Rules', () => {
  it('should validate pricing invariants', () => {
    // Valid pricing
    const validPricing = {
      basePrice: 10000,
      discountPercentage: 20,
      finalPrice: 8000,
    };

    expect(() => PricingInvariantContract.parse(validPricing)).not.toThrow();

    // Invalid pricing (wrong calculation)
    const invalidPricing = {
      basePrice: 10000,
      discountPercentage: 20,
      finalPrice: 9000, // Should be 8000
    };

    expect(() => PricingInvariantContract.parse(invalidPricing)).toThrow();
  });

  it('should validate refund invariants', () => {
    // Valid refund
    const validRefund = {
      originalAmount: 10000,
      refundAmount: 2000,
      previousRefunds: 3000,
    };

    expect(() => RefundInvariantContract.parse(validRefund)).not.toThrow();

    // Invalid refund (exceeds original)
    const invalidRefund = {
      originalAmount: 10000,
      refundAmount: 6000,
      previousRefunds: 5000, // Total would be 11000
    };

    expect(() => RefundInvariantContract.parse(invalidRefund)).toThrow();
  });

  it('should validate order state invariants', () => {
    // Valid state
    const validState = {
      currentStatus: 'completed',
      paymentStatus: 'paid',
      fulfillmentStatus: 'delivered',
    };

    expect(() => OrderStateInvariantContract.parse(validState)).not.toThrow();

    // Invalid state (completed but not paid)
    const invalidState = {
      currentStatus: 'completed',
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending',
    };

    expect(() => OrderStateInvariantContract.parse(invalidState)).toThrow();
  });

  it('should validate timestamp order', () => {
    const now = new Date();
    const later = new Date(now.getTime() + 1000);
    const muchLater = new Date(now.getTime() + 2000);

    // Valid timestamps
    const validTimestamps = {
      createdAt: now.toISOString(),
      updatedAt: later.toISOString(),
      paidAt: later.toISOString(),
      shippedAt: muchLater.toISOString(),
    };

    expect(() => TimestampInvariantContract.parse(validTimestamps)).not.toThrow();

    // Invalid timestamps (shipped before paid)
    const invalidTimestamps = {
      createdAt: now.toISOString(),
      updatedAt: later.toISOString(),
      paidAt: muchLater.toISOString(),
      shippedAt: later.toISOString(), // Before paid
    };

    expect(() => TimestampInvariantContract.parse(invalidTimestamps)).toThrow();
  });

  it('should validate refund requests', () => {
    const order = {
      amount: 10000,
      status: 'completed',
      createdAt: new Date(),
    };

    const policy = {
      maxDays: 30,
      maxPercentage: 1, // 100%
    };

    // Valid refund
    const validResult = validateRefundRequest(order, 5000, policy);
    expect(validResult.valid).toBe(true);

    // Invalid - exceeds amount
    const invalidResult = validateRefundRequest(order, 15000, policy);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.reason).toContain('exceeds maximum');

    // Invalid - order too old
    const oldOrder = {
      ...order,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    };
    const expiredResult = validateRefundRequest(oldOrder, 5000, policy);
    expect(expiredResult.valid).toBe(false);
    expect(expiredResult.reason).toContain('expired');
  });

  it('should validate discount codes', () => {
    const discount = {
      code: 'SAVE20',
      type: 'percentage' as const,
      value: 20,
      validFrom: new Date(Date.now() - 1000),
      validTo: new Date(Date.now() + 86400000),
      usageLimit: 100,
      usageCount: 50,
      minimumAmount: 5000,
    };

    // Valid discount
    const validResult = validateDiscountCode('SAVE20', discount, 10000);
    expect(validResult.valid).toBe(true);
    expect(validResult.discountAmount).toBe(2000);

    // Invalid - wrong code
    const wrongCode = validateDiscountCode('WRONG', discount, 10000);
    expect(wrongCode.valid).toBe(false);

    // Invalid - below minimum
    const belowMin = validateDiscountCode('SAVE20', discount, 3000);
    expect(belowMin.valid).toBe(false);
    expect(belowMin.reason).toContain('below minimum');
  });
});

describe('Critical Path: Payment Processing', () => {
  it('should validate Stripe payment data', () => {
    const stripeCharge = {
      id: 'ch_test_123',
      amount: 7900,
      currency: 'usd',
      customer: 'cus_test_123',
      description: 'Test charge',
      paid: true,
      refunded: false,
      status: 'succeeded',
    };

    const result = validateStripePayment(stripeCharge);
    expect(result.isValid).toBe(true);
    expect(result.parsed?.id).toBe('ch_test_123');
  });

  it('should format money correctly', () => {
    const money = {
      amount: 7900,
      currency: 'usd',
    };

    const formatted = formatMoney(money);
    expect(formatted).toBe('$79.00');
  });
});

describe('Critical Path: Database Operations', () => {
  it('should convert between snake_case and camelCase', () => {
    const snakeData = {
      stripe_session_id: 'cs_123',
      customer_email: 'test@example.com',
      payment_intent_id: 'pi_123',
      created_at: '2024-01-01',
    };

    const camelData = dbToCamelCase(snakeData);
    expect(camelData.stripeSessionId).toBe('cs_123');
    expect(camelData.customerEmail).toBe('test@example.com');
    expect(camelData.paymentIntentId).toBe('pi_123');
    expect(camelData.createdAt).toBe('2024-01-01');

    const backToSnake = camelToSnakeCase(camelData);
    expect(backToSnake.stripe_session_id).toBe('cs_123');
    expect(backToSnake.customer_email).toBe('test@example.com');
  });

  it('should validate database inserts', () => {
    const checkoutInsert = {
      stripe_session_id: 'cs_test_123',
      offer_id: 'test-product',
      status: 'pending',
      source: 'stripe',
    };

    const validatedCheckout = validateDBInsertCheckoutSession(checkoutInsert);
    expect(validatedCheckout.stripe_session_id).toBe('cs_test_123');

    const orderInsert = {
      stripe_session_id: 'cs_test_123',
      customer_email: 'test@example.com',
      amount_total: 7900,
      currency: 'usd',
      payment_status: 'succeeded',
      source: 'stripe',
    };

    const validatedOrder = validateDBInsertOrder(orderInsert);
    expect(validatedOrder.customer_email).toBe('test@example.com');
  });
});

describe('Regression Tests', () => {
  it('should reject invalid enum values', () => {
    const invalidStatus = {
      stripe_session_id: 'cs_123',
      offer_id: 'product',
      status: 'invalid_status', // Not in enum
      source: 'stripe',
    };

    expect(() => validateDBInsertCheckoutSession(invalidStatus)).toThrow();
  });

  it('should reject invalid payment sources', () => {
    const invalidSource = {
      stripe_session_id: 'cs_123',
      offer_id: 'product',
      source: 'bitcoin', // Not stripe or ghl
    };

    expect(() => validateDBInsertCheckoutSession(invalidSource)).toThrow();
  });

  it('should ensure critical fields are present', () => {
    const missingOfferId = {
      quantity: 1,
      customer: { email: 'test@example.com' },
    };

    expect(() => validateCheckoutRequest(missingOfferId)).toThrow();
  });

  it('should validate email formats', () => {
    const invalidEmail = {
      offerId: 'test-product',
      customer: {
        email: 'not-an-email',
      },
    };

    expect(() => validateCheckoutRequest(invalidEmail)).toThrow();
  });

  it('should validate Stripe ID formats', () => {
    const invalidSessionId = buildStripeCheckoutSessionFixture({ id: 'invalid_id' });

    expect(() => validateStripeCheckoutSession(invalidSessionId)).toThrow();
  });
});
