import { NextRequest, NextResponse } from "next/server";

import type Stripe from "stripe";

import { getOfferConfig } from "@/lib/offer-config";
import { getStripeClient, isUsingTestKeys, resolvePriceForEnvironment } from "@/lib/stripe";
import { getOptionalStripePaymentConfigId } from "@/lib/stripe-environment";
import { markStaleCheckoutSessions, upsertCheckoutSession } from "@/lib/checkout-store";
import { checkoutSessionSchema, sanitizeInput } from "@/lib/validation/checkout";
import { checkoutRateLimit, withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { validateCoupon as validateCouponCode } from "@/lib/coupons";

function buildErrorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  return withRateLimit(request, checkoutRateLimit, async () => {
    const parseResult = checkoutSessionSchema.safeParse(await request.json());

  if (!parseResult.success) {
    return buildErrorResponse(
      parseResult.error.issues.map((issue) => issue.message).join(", ")
    );
  }

  const parsedBody = parseResult.data;

  let couponValidation: Awaited<ReturnType<typeof validateCouponCode>> | null = null;
  let normalizedCouponCode: string | undefined;

  // Sanitize string inputs
  if (parsedBody.offerId) {
    parsedBody.offerId = sanitizeInput(parsedBody.offerId);
  }
  if (parsedBody.affiliateId) {
    parsedBody.affiliateId = sanitizeInput(parsedBody.affiliateId);
  }

  const metadataFromRequest: Record<string, string> = {
    ...(parsedBody.metadata ?? {}),
  };

  if (parsedBody.couponCode) {
    const sanitizedCoupon = sanitizeInput(parsedBody.couponCode).trim();

    if (!sanitizedCoupon) {
      return buildErrorResponse("Coupon code is required");
    }

    couponValidation = await validateCouponCode(sanitizedCoupon);

    if (!couponValidation.valid) {
      return buildErrorResponse(couponValidation.error ?? "Invalid coupon code");
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

  parsedBody.metadata = metadataFromRequest;
  if (normalizedCouponCode) {
    parsedBody.couponCode = normalizedCouponCode;
  }

  const offer = getOfferConfig(parsedBody.offerId);

  // If no Stripe configuration, use simple checkout
  if (!offer) {
    try {
      const { createSimpleCheckout } = await import('@/lib/simple-checkout');
      const session = await createSimpleCheckout({
        offerId: parsedBody.offerId,
        quantity: parsedBody.quantity,
        metadata: parsedBody.metadata,
        customer: parsedBody.customer,
        affiliateId: parsedBody.affiliateId,
      });

      // Save to database
      await markStaleCheckoutSessions();
      await upsertCheckoutSession({
        stripeSessionId: session.id,
        paymentIntentId: session.payment_intent as string | null,
        offerId: parsedBody.offerId,
        landerId: parsedBody.offerId,
        customerEmail: parsedBody.customer?.email || null,
        metadata: {
          ...parsedBody.metadata,
          affiliateId: parsedBody.affiliateId,
        },
        status: 'pending',
        source: 'stripe',
      });

      return NextResponse.json({
        id: session.id,
        url: session.url,
      });
    } catch (error) {
      console.error('Simple checkout failed:', error);
      return buildErrorResponse(`Checkout failed: ${(error as Error).message}`, 502);
    }
  }

  const stripe = getStripeClient();
  const mode = parsedBody.mode ?? offer.mode;

  const landerId =
    parsedBody.metadata?.landerId ??
    offer.metadata?.landerId ??
    offer.metadata?.productSlug ??
    offer.id;

  const sessionMetadata: Record<string, string> = {
    ...(offer.metadata ?? {}),
    ...(parsedBody.metadata ?? {}),
    offerId: offer.id,
    landerId,
    environment: isUsingTestKeys() ? "test" : "live",
  };

  if (parsedBody.clientReferenceId) {
    sessionMetadata.clientReferenceId = parsedBody.clientReferenceId;
  }

  if (parsedBody.affiliateId) {
    sessionMetadata.affiliateId = parsedBody.affiliateId;
  }

  try {
    const price = await resolvePriceForEnvironment({
      id: offer.id,
      priceId: offer.stripePriceId,
      productName: offer.productName,
      productDescription: offer.productDescription,
      productImage: offer.productImage,
    });

    if (couponValidation?.discount && typeof price.unit_amount === "number") {
      const baseAmountCents = price.unit_amount * parsedBody.quantity;
      let discountCents = 0;

      if (couponValidation.discount.type === "percentage") {
        discountCents = Math.round(baseAmountCents * (couponValidation.discount.amount / 100));
      } else {
        discountCents = couponValidation.discount.amount * parsedBody.quantity;
      }

      if (discountCents > baseAmountCents) {
        discountCents = baseAmountCents;
      }

      const adjustedCents = Math.max(0, baseAmountCents - discountCents);

      sessionMetadata.couponDiscountCents = String(discountCents);
      sessionMetadata.couponSubtotalCents = String(baseAmountCents);
      sessionMetadata.couponAdjustedTotalCents = String(adjustedCents);
    }

    const stripeProduct = price.product;

    if (stripeProduct) {
      const productId = typeof stripeProduct === "string" ? stripeProduct : stripeProduct.id;
      const currentProduct =
        typeof stripeProduct === "string"
          ? await stripe.products.retrieve(stripeProduct)
          : (stripeProduct as Stripe.Product);

      const desiredName = offer.productName ?? currentProduct.name;
      const desiredDescription = offer.productDescription ?? currentProduct.description ?? undefined;
      const desiredImages = offer.productImage ? [offer.productImage] : undefined;

      const updates: Stripe.ProductUpdateParams = {};

      if (desiredName && currentProduct.name !== desiredName) {
        updates.name = desiredName;
      }

      if (desiredDescription && currentProduct.description !== desiredDescription) {
        updates.description = desiredDescription;
      }

      if (
        desiredImages &&
        desiredImages.length > 0 &&
        (!currentProduct.images || desiredImages.some((image) => !currentProduct.images?.includes(image)))
      ) {
        updates.images = desiredImages;
      }

      if (Object.keys(updates).length > 0) {
        await stripe.products.update(productId, updates);
      }
    }

    // Configure payment methods - two options:
    // Option 1: Use a payment configuration ID (manages all payment methods in Stripe Dashboard)
    // Option 2: Specify payment_method_types directly (manual control)

    const paymentConfigId = getOptionalStripePaymentConfigId();

    let sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode,
      client_reference_id: parsedBody.clientReferenceId,
      line_items: [
        {
          price: price.id,
          quantity: parsedBody.quantity,
        },
      ],
      customer_email: parsedBody.customer?.email,
      metadata: sessionMetadata,
      allow_promotion_codes: true,  // Enable coupon codes
      billing_address_collection: 'auto',  // Collect billing address which includes name
      custom_text: {
        submit: {
          message: `Secure checkout for ${offer.productName ?? offer.id}`,
        },
      },
    };

    if (couponValidation?.stripePromotionCode) {
      sessionParams.discounts = [
        {
          promotion_code: couponValidation.stripePromotionCode,
        },
      ];
    }

    // Add payment method configuration
    if (paymentConfigId) {
      // Use payment configuration from Stripe Dashboard
      logger.debug("checkout.payment_config_used", { paymentConfigId });
      sessionParams.payment_method_configuration = paymentConfigId;
    } else {
      // Use explicit payment method types
      const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = process.env.STRIPE_CHECKOUT_PAYMENT_METHODS
        ? process.env.STRIPE_CHECKOUT_PAYMENT_METHODS.split(",").map(m => m.trim()) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[]
        : ["card"];  // Default: card includes all cards, Apple Pay, Google Pay, and Link

      logger.debug("checkout.payment_methods", { paymentMethodTypes: paymentMethodTypes.join(", ") });
      sessionParams.payment_method_types = paymentMethodTypes;
    }

    // Configure for embedded or hosted mode
    if (parsedBody.uiMode === "embedded") {
      sessionParams.ui_mode = "embedded";
      sessionParams.return_url = offer.successUrl;
    } else {
      sessionParams.success_url = offer.successUrl;
      sessionParams.cancel_url = offer.cancelUrl;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    void upsertCheckoutSession({
      stripeSessionId: session.id,
      offerId: offer.id,
      landerId,
      paymentIntentId,
      customerEmail: parsedBody.customer?.email ?? null,
      metadata: sessionMetadata,
      status: "pending",
      source: "stripe",
    }).catch((error) => {
      console.error("[checkout] Failed to persist checkout session", {
        sessionId: session.id,
        error,
      });
    });

    void markStaleCheckoutSessions().catch((error) => {
      console.error("[checkout] Failed to mark stale checkout sessions", { error });
    });

    // Return appropriate response based on UI mode
    if (parsedBody.uiMode === "embedded") {
      return NextResponse.json({
        id: session.id,
        client_secret: session.client_secret,
        status: session.payment_status,
        mode: session.mode,
      });
    } else {
      return NextResponse.json({
        id: session.id,
        url: session.url,
        status: session.payment_status,
        mode: session.mode,
      });
    }
  } catch (error) {
    if (error && typeof error === "object" && "message" in error) {
      return buildErrorResponse(`Stripe error: ${String(error.message)}`, 502);
    }

    return buildErrorResponse("Unexpected error while creating checkout session", 500);
  }
  });
}
