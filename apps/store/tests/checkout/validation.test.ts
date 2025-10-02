import { describe, it, expect } from 'vitest';
import {
  checkoutSessionSchema,
  customerSchema,
  couponSchema,
  sanitizeInput,
  validateCheckoutSession,
  validateCustomer,
  validateCoupon,
} from '@/lib/validation/checkout';

describe('Checkout Validation', () => {
  describe('Customer Schema', () => {
    it('should validate a valid customer', () => {
      const validCustomer = {
        email: 'test@example.com',
        name: 'John Doe',
        phone: '+1234567890',
      };

      const result = customerSchema.safeParse(validCustomer);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidCustomer = {
        email: 'not-an-email',
        name: 'John Doe',
      };

      const result = customerSchema.safeParse(invalidCustomer);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address');
      }
    });

    it('should reject invalid phone format', () => {
      const invalidCustomer = {
        email: 'test@example.com',
        phone: 'abc123',
      };

      const result = customerSchema.safeParse(invalidCustomer);
      expect(result.success).toBe(false);
    });

    it('should reject names with invalid characters', () => {
      const invalidCustomer = {
        email: 'test@example.com',
        name: 'John<script>alert(1)</script>',
      };

      const result = customerSchema.safeParse(invalidCustomer);
      expect(result.success).toBe(false);
    });

    it('should allow optional fields', () => {
      const minimalCustomer = {
        email: 'test@example.com',
      };

      const result = customerSchema.safeParse(minimalCustomer);
      expect(result.success).toBe(true);
    });
  });

  describe('Checkout Session Schema', () => {
    it('should validate a valid checkout session', () => {
      const validSession = {
        offerId: 'tiktok-downloader',
        quantity: 1,
        mode: 'payment',
        uiMode: 'embedded',
        affiliateId: 'AFF123',
        customer: {
          email: 'test@example.com',
        },
        metadata: {
          source: 'homepage',
        },
      };

      const result = checkoutSessionSchema.safeParse(validSession);
      expect(result.success).toBe(true);
    });

    it('should require offerId', () => {
      const invalidSession = {
        quantity: 1,
      };

      const result = checkoutSessionSchema.safeParse(invalidSession);
      expect(result.success).toBe(false);
    });

    it('should reject invalid offerId format', () => {
      const invalidSession = {
        offerId: 'Invalid-Offer-ID!',
        quantity: 1,
      };

      const result = checkoutSessionSchema.safeParse(invalidSession);
      expect(result.success).toBe(false);
    });

    it('should reject quantity outside valid range', () => {
      const tooMany = {
        offerId: 'test-product',
        quantity: 11,
      };

      const result1 = checkoutSessionSchema.safeParse(tooMany);
      expect(result1.success).toBe(false);

      const tooFew = {
        offerId: 'test-product',
        quantity: 0,
      };

      const result2 = checkoutSessionSchema.safeParse(tooFew);
      expect(result2.success).toBe(false);
    });

    it('should reject invalid payment mode', () => {
      const invalidMode = {
        offerId: 'test-product',
        mode: 'invalid' as any,
      };

      const result = checkoutSessionSchema.safeParse(invalidMode);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UI mode', () => {
      const invalidUIMode = {
        offerId: 'test-product',
        uiMode: 'invalid' as any,
      };

      const result = checkoutSessionSchema.safeParse(invalidUIMode);
      expect(result.success).toBe(false);
    });

    it('should reject too many metadata fields', () => {
      const tooMuchMetadata: any = {
        offerId: 'test-product',
        metadata: {},
      };

      // Add 51 metadata fields
      for (let i = 0; i < 51; i++) {
        tooMuchMetadata.metadata[`field${i}`] = 'value';
      }

      const result = checkoutSessionSchema.safeParse(tooMuchMetadata);
      expect(result.success).toBe(false);
    });
  });

  describe('Coupon Schema', () => {
    it('should validate valid coupon codes', () => {
      const validCoupons = [
        { code: 'SAVE20' },
        { code: 'WELCOME-2024' },
        { code: 'DISCOUNT_50' },
      ];

      validCoupons.forEach(coupon => {
        const result = couponSchema.safeParse(coupon);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid coupon format', () => {
      const invalidCoupon = {
        code: 'INVALID COUPON!',
      };

      const result = couponSchema.safeParse(invalidCoupon);
      expect(result.success).toBe(false);
    });

    it('should reject too short coupon codes', () => {
      const shortCoupon = {
        code: 'AB',
      };

      const result = couponSchema.safeParse(shortCoupon);
      expect(result.success).toBe(false);
    });

    it('should reject too long coupon codes', () => {
      const longCoupon = {
        code: 'A'.repeat(51),
      };

      const result = couponSchema.safeParse(longCoupon);
      expect(result.success).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    it('should remove HTML tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('Hello  World');
    });

    it('should remove script tags completely', () => {
      const input = '<script>malicious code</script>Normal text';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('Normal text');
    });

    it('should trim whitespace', () => {
      const input = '  test input  ';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('test input');
    });

    it('should handle normal text unchanged', () => {
      const input = 'Normal text without HTML';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('Normal text without HTML');
    });
  });

  describe('Validation Helper Functions', () => {
    it('validateCheckoutSession should handle valid data', () => {
      const validData = {
        offerId: 'test-product',
        quantity: 1,
      };

      const result = validateCheckoutSession(validData);
      expect(result.success).toBe(true);
    });

    it('validateCustomer should handle valid data', () => {
      const validData = {
        email: 'test@example.com',
      };

      const result = validateCustomer(validData);
      expect(result.success).toBe(true);
    });

    it('validateCoupon should handle valid data', () => {
      const validData = {
        code: 'TESTCOUPON',
      };

      const result = validateCoupon(validData);
      expect(result.success).toBe(true);
    });

    it('should handle undefined input gracefully', () => {
      const result = validateCheckoutSession(undefined);
      expect(result.success).toBe(false);
    });

    it('should handle null input gracefully', () => {
      const result = validateCustomer(null);
      expect(result.success).toBe(false);
    });
  });
});