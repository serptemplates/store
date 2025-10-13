import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPayPalOrder, isPayPalConfigured } from "@/lib/payments/paypal";
import { getOfferConfig } from "@/lib/products/offer-config";
import { getProductData } from "@/lib/products/product";
import { markStaleCheckoutSessions, upsertCheckoutSession } from "@/lib/checkout/store";
import { validateCoupon as validateCouponCode } from "@/lib/payments/coupons";
import { sanitizeInput } from "@/lib/validation/checkout";
import logger from "@/lib/logger";

const requestSchema = z.object({
  offerId: z.string().min(1, "offerId is required"),
  quantity: z.number().int().min(1).max(10).optional().default(1),
  affiliateId: z.string().min(1).optional(),
  metadata: z.record(z.string()).optional(),
  customer: z
    .object({
      email: z.string().email("Invalid email").optional(),
      name: z.string().max(120).optional(),
    })
    .optional(),
  couponCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Check if PayPal is configured
  if (!isPayPalConfigured()) {
    return NextResponse.json(
      { error: "PayPal is not configured" },
      { status: 503 }
    );
  }

  let parsedBody: z.infer<typeof requestSchema>;

  try {
    const json = await request.json();
    parsedBody = requestSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  parsedBody.offerId = sanitizeInput(parsedBody.offerId);

  if (parsedBody.affiliateId) {
    parsedBody.affiliateId = sanitizeInput(parsedBody.affiliateId);
  }

  if (parsedBody.customer?.name) {
    parsedBody.customer.name = sanitizeInput(parsedBody.customer.name);
  }

  const offer = getOfferConfig(parsedBody.offerId);

  if (!offer) {
    return NextResponse.json(
      { error: `Offer ${parsedBody.offerId} is not configured` },
      { status: 404 }
    );
  }

  const metadataFromRequest: Record<string, string> = {
    ...(parsedBody.metadata ?? {}),
  };

  const forwardedForHeader = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedForHeader?.split(",")[0]?.trim();
  const realIpHeader = request.headers.get("x-real-ip");
  const realIp = realIpHeader?.split(",")[0]?.trim();
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  const vercelIp = vercelForwardedFor?.split(",")[0]?.trim();
  const clientIp = forwardedIp ?? realIp ?? vercelIp ?? undefined;

  const userAgentRaw = request.headers.get("user-agent") ?? undefined;
  const userAgent = userAgentRaw ? userAgentRaw.slice(0, 250) : undefined;

  const normalizedCheckoutSource = metadataFromRequest.checkoutSource?.trim();
  if (!normalizedCheckoutSource) {
    metadataFromRequest.checkoutSource = "custom_checkout_paypal";
  } else {
    metadataFromRequest.checkoutSource = normalizedCheckoutSource;
  }

  if (metadataFromRequest.termsAccepted !== undefined) {
    metadataFromRequest.termsAccepted = String(
      metadataFromRequest.termsAccepted === "true" || metadataFromRequest.termsAccepted === "1"
    );
  }

  if (metadataFromRequest.termsAccepted !== "true") {
    metadataFromRequest.termsAccepted = "true";
  }

  if (metadataFromRequest.termsAcceptedAt && !metadataFromRequest.termsAcceptedAtClient) {
    metadataFromRequest.termsAcceptedAtClient = metadataFromRequest.termsAcceptedAt;
  }
  metadataFromRequest.termsAcceptedAt = new Date().toISOString();

  if (clientIp) {
    metadataFromRequest.termsAcceptedIp = clientIp;
  }

  if (userAgent) {
    metadataFromRequest.termsAcceptedUserAgent = userAgent;
  }

  let couponValidation: Awaited<ReturnType<typeof validateCouponCode>> | null = null;
  let normalizedCouponCode: string | undefined;

  if (parsedBody.couponCode) {
    const sanitizedCoupon = sanitizeInput(parsedBody.couponCode).trim();

    if (!sanitizedCoupon) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    couponValidation = await validateCouponCode(sanitizedCoupon);

    if (!couponValidation.valid) {
      return NextResponse.json(
        { error: couponValidation.error ?? "Invalid coupon code" },
        { status: 400 }
      );
    }

    normalizedCouponCode = couponValidation.code ?? sanitizedCoupon;
    metadataFromRequest.couponCode = normalizedCouponCode;

    if (couponValidation.discount) {
      metadataFromRequest.couponType = couponValidation.discount.type;
      metadataFromRequest.couponValue = String(couponValidation.discount.amount);
      if (couponValidation.discount.currency) {
        metadataFromRequest.couponCurrency = couponValidation.discount.currency.toUpperCase();
      }
    }

    if (couponValidation.stripePromotionCode) {
      metadataFromRequest.couponStripePromotionCode = couponValidation.stripePromotionCode;
    }
  }

  // Get product data for price
  const product = getProductData(parsedBody.offerId);
  const priceString = product.pricing?.price?.replace(/[^0-9.]/g, "") || "0";
  const price = parseFloat(priceString);
  const quantity = parsedBody.quantity ?? 1;

  const subtotalCents = Math.round(price * 100) * quantity;

  let discountCents = 0;
  if (couponValidation?.discount) {
    if (couponValidation.discount.type === "percentage") {
      discountCents = Math.round(subtotalCents * (couponValidation.discount.amount / 100));
    } else {
      discountCents = couponValidation.discount.amount * quantity;
    }
  }

  if (discountCents > subtotalCents) {
    discountCents = subtotalCents;
  }

  const totalAmountCents = Math.max(0, subtotalCents - discountCents);
  const totalAmount = (totalAmountCents / 100).toFixed(2);

  if (normalizedCouponCode) {
    metadataFromRequest.couponSubtotalCents = String(subtotalCents);
    metadataFromRequest.couponDiscountCents = String(discountCents);
    metadataFromRequest.couponAdjustedTotalCents = String(totalAmountCents);
  }

  parsedBody.metadata = metadataFromRequest;
  if (normalizedCouponCode) {
    parsedBody.couponCode = normalizedCouponCode;
  }

  try {
    // Mark stale checkout sessions
    await markStaleCheckoutSessions();

    const orderMetadata: Record<string, string> = {
      ...parsedBody.metadata,
    };

    if (parsedBody.affiliateId) {
      orderMetadata.affiliateId = parsedBody.affiliateId;
    }

    if (parsedBody.customer?.email) {
      orderMetadata.customerEmail = parsedBody.customer.email;
    }

    if (parsedBody.customer?.name) {
      orderMetadata.customerName = parsedBody.customer.name;
    }

    // Create PayPal order
    const paypalOrder = await createPayPalOrder({
      amount: totalAmount,
      currency: "USD",
      description: product.name || `Purchase of ${parsedBody.offerId}`,
      offerId: parsedBody.offerId,
      metadata: orderMetadata,
    });

    // Store checkout session in database
    if (!paypalOrder.id) {
      throw new Error("PayPal order did not return an ID");
    }

    await upsertCheckoutSession({
      stripeSessionId: `paypal_${paypalOrder.id}`,
      paymentIntentId: null,
      offerId: parsedBody.offerId,
      landerId: parsedBody.offerId,
      customerEmail: parsedBody.customer?.email || null,
      metadata: {
        ...parsedBody.metadata,
        affiliateId: parsedBody.affiliateId,
        paypalOrderId: paypalOrder.id,
        source: "paypal",
      },
      status: "pending",
      source: "paypal",
    });

    return NextResponse.json({
      orderId: paypalOrder.id,
      status: paypalOrder.status,
      links: paypalOrder.links,
    });
  } catch (error) {
    logger.error("paypal.create_order_failed", {
      error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
    });
    return NextResponse.json(
      { error: "Failed to create PayPal order" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
