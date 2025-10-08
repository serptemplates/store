import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { validateCoupon as validateCouponCode } from "@/lib/payments/coupons";
import { sanitizeInput } from "@/lib/validation/checkout";

const requestSchema = z.object({
  couponCode: z
    .string({ required_error: "Coupon code is required" })
    .min(1, "Coupon code is required")
    .max(100, "Coupon code is too long"),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      const [firstIssue] = parsed.error.issues;
      const message = firstIssue?.message ?? "Invalid coupon request";
      return NextResponse.json({ valid: false, error: message }, { status: 400 });
    }

    const rawCode = parsed.data.couponCode;
    const sanitizedCode = sanitizeInput(rawCode).trim();

    if (!sanitizedCode) {
      return NextResponse.json({ valid: false, error: "Coupon code is required" }, { status: 400 });
    }

    const result = await validateCouponCode(sanitizedCode);

    if (!result.valid) {
      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json({
      valid: true,
      code: result.code ?? sanitizedCode,
      discount: result.discount,
      stripePromotionCode: result.stripePromotionCode,
    });
  } catch (error) {
    console.error("[coupon] validation failed", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate coupon" },
      { status: 500 },
    );
  }
}
