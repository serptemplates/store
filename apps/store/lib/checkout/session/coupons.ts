import { sanitizeInput } from "@/lib/validation/checkout";
import { validateCoupon as validateCouponCode } from "@/lib/payments/coupons";

import type { CheckoutSessionPayload } from "./validation";

export interface CouponAdjustments {
  discountCents?: number;
  subtotalCents?: number;
  adjustedTotalCents?: number;
  originalUnitAmount?: number;
  adjustedUnitAmount?: number;
}

export interface CouponSuccess {
  ok: true;
  metadata: Record<string, string>;
  couponCode?: string;
  couponValidation?: Awaited<ReturnType<typeof validateCouponCode>>;
  adjustments: CouponAdjustments;
}

export type CouponResult =
  | CouponSuccess
  | { ok: false; message: string };

export async function applyCouponIfPresent(
  body: CheckoutSessionPayload,
  metadata: Record<string, string>,
): Promise<CouponResult> {
  if (!body.couponCode) {
    return {
      ok: true,
      metadata,
      couponCode: undefined,
      couponValidation: undefined,
      adjustments: {},
    };
  }

  const sanitized = sanitizeInput(body.couponCode).trim();

  if (!sanitized) {
    return { ok: false, message: "Coupon code is required" };
  }

  const couponValidation = await validateCouponCode(sanitized);

  if (!couponValidation.valid) {
    return { ok: false, message: couponValidation.error ?? "Invalid coupon code" };
  }

  const normalizedCouponCode = couponValidation.code ?? sanitized;
  const nextMetadata: Record<string, string> = { ...metadata, couponCode: normalizedCouponCode };

  if (couponValidation.discount) {
    nextMetadata.couponType = couponValidation.discount.type;
    nextMetadata.couponValue = String(couponValidation.discount.amount);
    if (couponValidation.discount.currency) {
      nextMetadata.couponCurrency = couponValidation.discount.currency.toUpperCase();
    }
  }

  if (couponValidation.stripePromotionCode) {
    nextMetadata.couponStripePromotionCode = couponValidation.stripePromotionCode;
  }

  return {
    ok: true,
    metadata: nextMetadata,
    couponCode: normalizedCouponCode,
    couponValidation,
    adjustments: {},
  };
}
