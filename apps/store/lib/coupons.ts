import { getStripeClient } from "./stripe";

export interface CouponValidation {
  valid: boolean;
  code?: string;
  discount?: {
    type: 'percentage' | 'fixed';
    amount: number; // percentage (0-100) or fixed amount in cents
    currency?: string;
  };
  error?: string;
  stripePromotionCode?: string;
}

// In-memory coupon store for testing (replace with database in production)
const TEST_COUPONS: Record<string, {
  discount: { type: 'percentage' | 'fixed'; amount: number; currency?: string };
  expiresAt?: Date;
  maxUses?: number;
  currentUses?: number;
}> = {
  'SAVE20': { discount: { type: 'percentage', amount: 20 } },
  'WELCOME10': { discount: { type: 'percentage', amount: 10 }, maxUses: 100, currentUses: 0 },
  'FIXED5': { discount: { type: 'fixed', amount: 500, currency: 'usd' } }, // $5 off
  'BLACKFRIDAY': { discount: { type: 'percentage', amount: 30 }, expiresAt: new Date('2025-12-01') },
};

export async function validateCoupon(
  code: string,
  offerId?: string
): Promise<CouponValidation> {
  if (!code) {
    return { valid: false, error: "Coupon code is required" };
  }

  const normalizedCode = code.toUpperCase().trim();

  // First check Stripe promotion codes
  try {
    const stripe = getStripeClient();
    const promotionCodes = await stripe.promotionCodes.list({
      code: normalizedCode,
      active: true,
      limit: 1,
    });

    if (promotionCodes.data.length > 0) {
      const promoCode = promotionCodes.data[0];
      const coupon = await stripe.coupons.retrieve(
        typeof promoCode.coupon === 'string' ? promoCode.coupon : promoCode.coupon.id
      );

      // Check if coupon is still valid
      if (!coupon.valid) {
        return { valid: false, error: "This coupon has expired" };
      }

      // Check redemption limits
      if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
        return { valid: false, error: "This coupon has reached its usage limit" };
      }

      return {
        valid: true,
        code: normalizedCode,
        discount: {
          type: coupon.percent_off ? 'percentage' : 'fixed',
          amount: coupon.percent_off || coupon.amount_off || 0,
          currency: coupon.currency || 'usd',
        },
        stripePromotionCode: promoCode.id,
      };
    }
  } catch (error) {
    console.error('Error checking Stripe promotion codes:', error);
    // Continue to check local coupons
  }

  // Check local test coupons (for development)
  if (process.env.NODE_ENV === 'development' && TEST_COUPONS[normalizedCode]) {
    const coupon = TEST_COUPONS[normalizedCode];

    // Check expiration
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { valid: false, error: "This coupon has expired" };
    }

    // Check usage limits
    if (coupon.maxUses && coupon.currentUses && coupon.currentUses >= coupon.maxUses) {
      return { valid: false, error: "This coupon has reached its usage limit" };
    }

    return {
      valid: true,
      code: normalizedCode,
      discount: coupon.discount,
    };
  }

  return { valid: false, error: "Invalid coupon code" };
}

export function calculateDiscountedPrice(
  originalPrice: number,
  discount: CouponValidation['discount']
): number {
  if (!discount) return originalPrice;

  if (discount.type === 'percentage') {
    const discountAmount = originalPrice * (discount.amount / 100);
    return Math.max(0, originalPrice - discountAmount);
  } else {
    // Fixed discount
    return Math.max(0, originalPrice - discount.amount);
  }
}

export async function applyCouponToSession(
  sessionId: string,
  couponCode: string
): Promise<{ success: boolean; error?: string }> {
  const validation = await validateCoupon(couponCode);

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const stripe = getStripeClient();

    // If it's a Stripe promotion code, we can apply it to the session
    if (validation.stripePromotionCode) {
      // Note: Stripe doesn't allow modifying promotion codes on existing sessions
      // This would need to be handled during session creation
      return {
        success: true,
      };
    }

    // For local coupons, we'd need to handle this differently
    // Perhaps by creating a custom discount or adjusting the price
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error applying coupon:', error);
    return {
      success: false,
      error: 'Failed to apply coupon',
    };
  }
}

// Helper function to create Stripe coupons programmatically
export async function createStripeCoupon(params: {
  code: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  duration?: 'once' | 'forever' | 'repeating';
  durationInMonths?: number;
  maxRedemptions?: number;
}) {
  const stripe = getStripeClient();

  try {
    // Create the coupon
    const coupon = await stripe.coupons.create({
      percent_off: params.percentOff,
      amount_off: params.amountOff,
      currency: params.currency || 'usd',
      duration: params.duration || 'once',
      duration_in_months: params.durationInMonths,
      max_redemptions: params.maxRedemptions,
      metadata: {
        created_by: 'checkout_system',
      },
    });

    // Create a promotion code for the coupon
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: params.code.toUpperCase(),
      active: true,
    });

    return {
      coupon,
      promotionCode,
    };
  } catch (error) {
    console.error('Error creating Stripe coupon:', error);
    throw error;
  }
}