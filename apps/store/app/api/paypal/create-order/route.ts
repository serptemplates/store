import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPayPalOrder, isPayPalConfigured } from "@/lib/payments/paypal";
import { findPriceEntry, formatAmountFromCents } from "@/lib/pricing/price-manifest";
import { getOfferConfig } from "@/lib/products/offer-config";
import { getProductData } from "@/lib/products/product";
import { markStaleCheckoutSessions, upsertCheckoutSession } from "@/lib/checkout";
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


  const normalizedCheckoutSource = metadataFromRequest.checkoutSource?.trim();
  if (!normalizedCheckoutSource) {
    metadataFromRequest.checkoutSource = "hosted_checkout_paypal";
  } else {
    metadataFromRequest.checkoutSource = normalizedCheckoutSource;
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
  const quantity = parsedBody.quantity ?? 1;

  const priceEntry = findPriceEntry(product.stripe?.price_id, product.stripe?.test_price_id);
  const fallbackPriceString = product.pricing?.price?.replace(/[^0-9.]/g, "") || "0";
  const fallbackPrice = Number.parseFloat(fallbackPriceString);
  const unitAmountCents = priceEntry?.unitAmount ?? Math.round(Number.isFinite(fallbackPrice) ? fallbackPrice * 100 : 0);
  const currency = priceEntry?.currency ?? product.pricing?.currency?.toUpperCase() ?? "USD";
  const baseSubtotalCents = unitAmountCents * quantity;

  const baseDisplayPrice = priceEntry
    ? formatAmountFromCents(priceEntry.unitAmount, currency)
    : product.pricing?.price ?? `$${fallbackPrice.toFixed(2)}`;

  let discountCents = 0;
  if (couponValidation?.discount) {
    if (couponValidation.discount.type === "percentage") {
      discountCents = Math.round(baseSubtotalCents * (couponValidation.discount.amount / 100));
    } else {
      discountCents = couponValidation.discount.amount * quantity;
    }
  }

  if (discountCents > baseSubtotalCents) {
    discountCents = baseSubtotalCents;
  }

  const discountedSubtotalCents = Math.max(0, baseSubtotalCents - discountCents);
  const totalAmountCents = discountedSubtotalCents;
  const totalAmount = (totalAmountCents / 100).toFixed(2);

  if (normalizedCouponCode) {
    metadataFromRequest.couponSubtotalCents = String(baseSubtotalCents);
    metadataFromRequest.couponDiscountCents = String(discountCents);
    metadataFromRequest.couponAdjustedTotalCents = String(discountedSubtotalCents);
  }

  metadataFromRequest.checkoutBaseSubtotalCents = String(baseSubtotalCents);
  metadataFromRequest.checkoutSubtotalCents = String(discountedSubtotalCents);
  metadataFromRequest.checkoutTotalCents = String(totalAmountCents);
  metadataFromRequest.checkoutCurrency = currency;
  metadataFromRequest.checkoutBasePriceDisplay = baseDisplayPrice;


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
      currency,
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
