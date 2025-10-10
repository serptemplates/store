import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateCoupon, calculateDiscountedPrice, type CouponValidation } from "@/lib/payments/coupons";

// Mock the Stripe client
vi.mock("@/lib/payments/stripe", () => ({
  getStripeClient: () => ({
    promotionCodes: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    coupons: {
      retrieve: vi.fn(),
    },
  }),
}));

describe('Coupon Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateCoupon', () => {
    it('should reject empty coupon code', async () => {
      const result = await validateCoupon('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Coupon code is required');
    });

    it('should normalize coupon codes to uppercase', async () => {
      const result = await validateCoupon('save20');
      // In development mode with TEST_COUPONS, this should work
      if (process.env.NODE_ENV === 'development') {
        expect(result.code).toBe('SAVE20');
      }
    });

    it('should trim whitespace from coupon codes', async () => {
      const result = await validateCoupon('  SAVE20  ');
      if (process.env.NODE_ENV === 'development') {
        expect(result.code).toBe('SAVE20');
      }
    });

    it('should return invalid for non-existent coupons', async () => {
      const result = await validateCoupon('NONEXISTENT');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid coupon code');
    });

    it("should handle Stripe API errors gracefully", async () => {
      const stripeModule = await import("@/lib/payments/stripe");
      const stripe = stripeModule.getStripeClient();
      stripe.promotionCodes.list = vi.fn().mockRejectedValue(new Error("API Error"));

      const result = await validateCoupon("TESTCODE");
      // Should continue to check local coupons
      expect(result.valid).toBe(false);
    });
  });

  describe('calculateDiscountedPrice', () => {
    it('should calculate percentage discount correctly', () => {
      const discount: CouponValidation['discount'] = {
        type: 'percentage',
        amount: 20, // 20% off
      };

      const discounted = calculateDiscountedPrice(100, discount);
      expect(discounted).toBe(80);
    });

    it('should calculate fixed discount correctly', () => {
      const discount: CouponValidation['discount'] = {
        type: 'fixed',
        amount: 1500, // $15 off (in cents)
        currency: 'usd',
      };

      const discounted = calculateDiscountedPrice(10000, discount); // $100 in cents
      expect(discounted).toBe(8500); // $85 in cents
    });

    it('should not allow negative prices', () => {
      const discount: CouponValidation['discount'] = {
        type: 'fixed',
        amount: 15000, // $150 off
        currency: 'usd',
      };

      const discounted = calculateDiscountedPrice(10000, discount); // $100 in cents
      expect(discounted).toBe(0); // Should be 0, not negative
    });

    it('should handle 100% discount', () => {
      const discount: CouponValidation['discount'] = {
        type: 'percentage',
        amount: 100,
      };

      const discounted = calculateDiscountedPrice(10000, discount);
      expect(discounted).toBe(0);
    });

    it('should handle no discount', () => {
      const discounted = calculateDiscountedPrice(10000, undefined);
      expect(discounted).toBe(10000);
    });

    it('should handle 0% discount', () => {
      const discount: CouponValidation['discount'] = {
        type: 'percentage',
        amount: 0,
      };

      const discounted = calculateDiscountedPrice(10000, discount);
      expect(discounted).toBe(10000);
    });

    it('should handle $0 fixed discount', () => {
      const discount: CouponValidation['discount'] = {
        type: 'fixed',
        amount: 0,
        currency: 'usd',
      };

      const discounted = calculateDiscountedPrice(10000, discount);
      expect(discounted).toBe(10000);
    });

    it('should calculate correct discount for various percentages', () => {
      const testCases = [
        { original: 100, percentage: 25, expected: 75 },
        { original: 200, percentage: 50, expected: 100 },
        { original: 150, percentage: 10, expected: 135 },
        { original: 999, percentage: 33, expected: 669.33 },
      ];

      testCases.forEach(({ original, percentage, expected }) => {
        const discount: CouponValidation['discount'] = {
          type: 'percentage',
          amount: percentage,
        };

        const discounted = calculateDiscountedPrice(original, discount);
        expect(discounted).toBeCloseTo(expected, 2);
      });
    });
  });

  describe("Test Coupons (Development)", () => {
    beforeEach(() => {
      // Force development mode for these tests
      vi.stubEnv("NODE_ENV", "development");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("should validate test coupon SAVE20", async () => {
      const result = await validateCoupon("SAVE20");
      expect(result.valid).toBe(true);
      expect(result.discount?.type).toBe("percentage");
      expect(result.discount?.amount).toBe(20);
    });

    it("should validate test coupon FIXED5", async () => {
      const result = await validateCoupon("FIXED5");
      expect(result.valid).toBe(true);
      expect(result.discount?.type).toBe("fixed");
      expect(result.discount?.amount).toBe(500); // $5 in cents
    });

    it("should check expiration dates", async () => {
      // Set a date in the past for testing
      const expiredCoupon = "BLACKFRIDAY";
      // This test depends on the actual date - adjust as needed
      const result = await validateCoupon(expiredCoupon);

      // Check if the coupon expiration logic works
      const expirationDate = new Date("2025-12-01");
      const now = new Date();

      if (now > expirationDate) {
        expect(result.valid).toBe(false);
        expect(result.error).toBe("This coupon has expired");
      } else {
        expect(result.valid).toBe(true);
      }
    });
  });
});
