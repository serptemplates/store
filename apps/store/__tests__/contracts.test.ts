/**
 * Contract Validation Tests
 *
 * Ensures all data contracts work correctly and catch malformed data
 * Run with: npm test contracts.test.ts
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateCheckoutSession,
  validateCheckoutRequest,
  validateOrder,
  hasGHLSyncData,
  extractGHLSyncMetadata,
} from '../lib/contracts/checkout.contract';

import {
  validateStripeCheckoutSession,
  validateStripePaymentIntent,
  validateStripeWebhookEvent,
  isStripeWebhookEvent,
} from '../lib/contracts/webhook.contract';

import {
  validateGHLConfig,
  validateGHLContact,
  validateGHLSyncRequest,
  formatGHLCustomerName,
  buildOpportunityName,
} from '../lib/contracts/ghl.contract';

import {
  validateDBInsertCheckoutSession,
  validateDBInsertOrder,
  dbToCamelCase,
  camelToSnakeCase,
} from '../lib/contracts/database.contract';

describe('Checkout Contracts', () => {
  describe('validateCheckoutRequest', () => {
    it('should validate a valid checkout request', () => {
      const validRequest = {
        offerId: 'demo-product',
        quantity: 2,
        customer: {
          email: 'test@example.com',
          name: 'Test User',
        },
        affiliateId: 'AFF123',
        metadata: {
          source: 'landing-page',
        },
      };

      const result = validateCheckoutRequest(validRequest);
      expect(result.offerId).toBe('demo-product');
      expect(result.quantity).toBe(2);
      expect(result.customer?.email).toBe('test@example.com');
    });

    it('should reject invalid email', () => {
      const invalidRequest = {
        offerId: 'demo-product',
        customer: {
          email: 'not-an-email',
        },
      };

      expect(() => validateCheckoutRequest(invalidRequest)).toThrow();
    });

    it('should reject missing offerId', () => {
      const invalidRequest = {
        quantity: 1,
      };

      expect(() => validateCheckoutRequest(invalidRequest)).toThrow();
    });

    it('should set default quantity to 1', () => {
      const request = {
        offerId: 'demo-product',
      };

      const result = validateCheckoutRequest(request);
      expect(result.quantity).toBe(1);
    });
  });

  describe('GHL Sync Metadata', () => {
    it('should detect GHL sync data in metadata', () => {
      const metadata = {
        ghlSyncedAt: '2025-09-27T10:00:00Z',
        ghlContactId: 'contact_123',
        otherField: 'value',
      };

      expect(hasGHLSyncData(metadata)).toBe(true);
    });

    it('should extract GHL sync metadata', () => {
      const metadata = {
        ghlSyncedAt: '2025-09-27T10:00:00Z',
        ghlContactId: 'contact_123',
        ghlError: null,
        otherField: 'ignored',
      };

      const result = extractGHLSyncMetadata(metadata);
      expect(result.ghlSyncedAt).toBe('2025-09-27T10:00:00Z');
      expect(result.ghlContactId).toBe('contact_123');
      expect(result.ghlError).toBeUndefined();
    });
  });
});

describe('Webhook Contracts', () => {
  describe('Stripe Checkout Session', () => {
    it('should validate a valid Stripe checkout session', () => {
      const validSession = {
        id: 'cs_test_123',
        object: 'checkout.session',
        amount_total: 7900,
        currency: 'usd',
        customer_email: 'test@example.com',
        metadata: {
          offerId: 'demo-product',
          affiliateId: 'AFF123',
        },
        mode: 'payment',
        payment_intent: 'pi_test_123',
        payment_status: 'paid',
        status: 'complete',
      };

      const result = validateStripeCheckoutSession(validSession);
      expect(result.id).toBe('cs_test_123');
      expect(result.amount_total).toBe(7900);
      expect(result.metadata.offerId).toBe('demo-product');
    });

    it('should reject session with invalid ID format', () => {
      const invalidSession = {
        id: 'invalid_id', // Should start with cs_
        object: 'checkout.session',
        amount_total: 7900,
        currency: 'usd',
        metadata: {},
        mode: 'payment',
        payment_status: 'paid',
        status: 'complete',
      };

      expect(() => validateStripeCheckoutSession(invalidSession)).toThrow();
    });
  });

  describe('Stripe Payment Intent', () => {
    it('should validate a valid payment intent', () => {
      const validIntent = {
        id: 'pi_test_123',
        object: 'payment_intent',
        amount: 7900,
        amount_capturable: 0,
        amount_received: 7900,
        currency: 'usd',
        metadata: {
          offerId: 'demo-product',
        },
        status: 'succeeded',
      };

      const result = validateStripePaymentIntent(validIntent);
      expect(result.id).toBe('pi_test_123');
      expect(result.amount).toBe(7900);
    });
  });

  describe('Webhook Event Type Guards', () => {
    it('should identify Stripe webhook events', () => {
      const stripeEvent = {
        id: 'evt_test_123',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
          },
        },
        livemode: false,
        pending_webhooks: 0,
      };

      expect(isStripeWebhookEvent(stripeEvent)).toBe(true);
    });

    it('should reject non-Stripe events', () => {
      const nonStripeEvent = {
        type: 'some.other.event',
        data: {},
      };

      expect(isStripeWebhookEvent(nonStripeEvent)).toBe(false);
    });
  });
});

describe('GHL Contracts', () => {
  describe('GHL Configuration', () => {
    it('should validate valid GHL config', () => {
      const config = {
        pipelineId: 'pipeline_123',
        stageId: 'stage_new',
        status: 'active',
        source: 'website',
        tagIds: ['tag_1', 'tag_2'],
        workflowIds: ['workflow_1'],
      };

      const result = validateGHLConfig(config);
      expect(result.pipelineId).toBe('pipeline_123');
      expect(result.tagIds).toHaveLength(2);
    });

    it('should allow empty GHL config', () => {
      const config = {};
      const result = validateGHLConfig(config);
      expect(result).toEqual({});
    });
  });

  describe('GHL Contact', () => {
    it('should format customer name correctly', () => {
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

      expect(formatGHLCustomerName(undefined)).toEqual({});
    });
  });

  describe('Opportunity Name Building', () => {
    it('should build opportunity name from template', () => {
      const template = '{name} - {product} - {amount}';
      const data = {
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        offerId: 'video-downloader',
        amount: 7900,
        currency: 'usd',
      };

      const result = buildOpportunityName(template, data);
      expect(result).toBe('John Doe - video-downloader - USD 79.00');
    });

    it('should handle missing customer name', () => {
      const template = '{name} - {email}';
      const data = {
        customerEmail: 'john@example.com',
        offerId: 'product',
        amount: 1000,
        currency: 'usd',
      };

      const result = buildOpportunityName(template, data);
      expect(result).toBe('Customer - john@example.com');
    });
  });
});

describe('Database Contracts', () => {
  describe('Database Insert Validation', () => {
    it('should validate checkout session insert', () => {
      const data = {
        stripe_session_id: 'cs_test_123',
        offer_id: 'demo-product',
        status: 'pending',
        source: 'stripe',
      };

      const result = validateDBInsertCheckoutSession(data);
      expect(result.stripe_session_id).toBe('cs_test_123');
      expect(result.status).toBe('pending');
    });

    it('should validate order insert', () => {
      const data = {
        stripe_session_id: 'cs_test_123',
        customer_email: 'test@example.com',
        amount_total: 7900,
        currency: 'usd',
        payment_status: 'succeeded',
        source: 'stripe',
      };

      const result = validateDBInsertOrder(data);
      expect(result.customer_email).toBe('test@example.com');
      expect(result.amount_total).toBe(7900);
    });
  });

  describe('Case Conversion', () => {
    it('should convert snake_case to camelCase', () => {
      const snakeData = {
        stripe_session_id: 'cs_123',
        customer_email: 'test@example.com',
        payment_intent_id: 'pi_123',
      };

      const result = dbToCamelCase(snakeData);
      expect(result.stripeSessionId).toBe('cs_123');
      expect(result.customerEmail).toBe('test@example.com');
      expect(result.paymentIntentId).toBe('pi_123');
    });

    it('should convert camelCase to snake_case', () => {
      const camelData = {
        stripeSessionId: 'cs_123',
        customerEmail: 'test@example.com',
        paymentIntentId: 'pi_123',
      };

      const result = camelToSnakeCase(camelData);
      expect(result.stripe_session_id).toBe('cs_123');
      expect(result.customer_email).toBe('test@example.com');
      expect(result.payment_intent_id).toBe('pi_123');
    });
  });
});

describe('Contract Regression Tests', () => {
  describe('Critical Field Presence', () => {
    it('should ensure checkout always has offerId', () => {
      const invalidData = {
        quantity: 1,
        customer: { email: 'test@example.com' },
      };

      expect(() => validateCheckoutRequest(invalidData)).toThrow();
    });

    it('should ensure webhook events have proper structure', () => {
      const malformedEvent = {
        type: 'checkout.session.completed',
        // Missing required fields
      };

      expect(() => validateStripeWebhookEvent(malformedEvent)).toThrow();
    });

    it('should ensure database inserts have required fields', () => {
      const invalidInsert = {
        // Missing stripe_session_id and offer_id
        status: 'pending',
      };

      expect(() => validateDBInsertCheckoutSession(invalidInsert)).toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should reject wrong enum values', () => {
      const invalidStatus = {
        stripe_session_id: 'cs_123',
        offer_id: 'product',
        status: 'invalid_status', // Not in enum
        source: 'stripe',
      };

      expect(() => validateDBInsertCheckoutSession(invalidStatus)).toThrow();
    });

    it('should reject wrong payment source', () => {
      const invalidSource = {
        stripe_session_id: 'cs_123',
        offer_id: 'product',
        source: 'bitcoin', // Not stripe or paypal
      };

      expect(() => validateDBInsertCheckoutSession(invalidSource)).toThrow();
    });
  });
});