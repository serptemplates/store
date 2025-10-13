import { NextRequest, NextResponse } from "next/server";

import type Stripe from "stripe";

import { getOfferConfig } from "@/lib/products/offer-config";
import { getStripeClient, isUsingTestKeys, resolvePriceForEnvironment } from "@/lib/payments/stripe";
import { getOptionalStripePaymentConfigId } from "@/lib/payments/stripe-environment";
import { markStaleCheckoutSessions, upsertCheckoutSession } from "@/lib/checkout/store";
import { checkoutSessionSchema, sanitizeInput } from "@/lib/validation/checkout";
import { checkoutRateLimit, withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { validateCoupon as validateCouponCode } from "@/lib/payments/coupons";

function buildErrorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  return withRateLimit(request, checkoutRateLimit, async () => {
    let requestPayload: unknown;
    try {
      requestPayload = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.debug("checkout.session.invalid_json", {
          error: error.message,
        });
        return buildErrorResponse("Invalid request payload", 400);
      }
      throw error;
    }

    const parseResult = checkoutSessionSchema.safeParse(requestPayload);

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
    metadataFromRequest.checkoutSource = parsedBody.uiMode === "embedded"
      ? "custom_checkout_stripe"
      : "stripe_checkout";
  } else {
    metadataFromRequest.checkoutSource = normalizedCheckoutSource;
  }

  if (metadataFromRequest.termsAccepted !== undefined) {
    metadataFromRequest.termsAccepted = String(
      metadataFromRequest.termsAccepted === "true" || metadataFromRequest.termsAccepted === "1"
    );
  }

  if (metadataFromRequest.termsAccepted !== "true") {
    // The embedded checkout is only available after the checkbox is accepted,
    // but we still normalize the value we persist for downstream systems.
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

  let couponDiscountCents: number | undefined;
  let couponSubtotalCents: number | undefined;
  let couponAdjustedTotalCents: number | undefined;
  let couponOriginalUnitAmount: number | undefined;
  let couponAdjustedUnitAmount: number | undefined;

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
      const { createSimpleCheckout } = await import('@/lib/checkout/simple-checkout');
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

  sessionMetadata.checkoutSource = metadataFromRequest.checkoutSource;
  sessionMetadata.termsAccepted = metadataFromRequest.termsAccepted;
  sessionMetadata.termsAcceptedAt = metadataFromRequest.termsAcceptedAt;

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

    const quantity = parsedBody.quantity;
    const unitAmount =
      typeof price.unit_amount === "number"
        ? price.unit_amount
        : typeof price.unit_amount_decimal === "string"
          ? Math.round(Number(price.unit_amount_decimal))
          : null;

    const stripeProduct = price.product;
    let productId: string | undefined;
    let currentProduct: Stripe.Product | null = null;

    if (stripeProduct) {
      productId = typeof stripeProduct === "string" ? stripeProduct : stripeProduct.id;
      const resolvedProduct =
        typeof stripeProduct === "string"
          ? await stripe.products.retrieve(stripeProduct)
          : (stripeProduct as Stripe.Product);

      currentProduct = resolvedProduct ?? null;

      if (currentProduct) {
        const safeProduct = currentProduct;
        const desiredName = offer.productName ?? safeProduct.name;
        const desiredDescription = offer.productDescription ?? safeProduct.description ?? undefined;
        const desiredImages = offer.productImage ? [offer.productImage] : undefined;

        const updates: Stripe.ProductUpdateParams = {};

        if (desiredName && safeProduct.name !== desiredName) {
          updates.name = desiredName;
        }

        if (desiredDescription && safeProduct.description !== desiredDescription) {
          updates.description = desiredDescription;
        }

        if (
          desiredImages &&
          desiredImages.length > 0 &&
          (!safeProduct.images || desiredImages.some((image) => !safeProduct.images?.includes(image)))
        ) {
          updates.images = desiredImages;
        }

        if (Object.keys(updates).length > 0 && productId) {
          await stripe.products.update(productId, updates);
        }
      }
    }

    if (couponValidation?.discount && unitAmount === null) {
      return buildErrorResponse("Unable to apply coupon to this price");
    }

    let customLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] | null = null;

    if (couponValidation?.discount && unitAmount !== null) {
      const subtotalCents = unitAmount * quantity;
      let discountCents = 0;

      if (couponValidation.discount.type === "percentage") {
        discountCents = Math.round(subtotalCents * (couponValidation.discount.amount / 100));
      } else {
        discountCents = couponValidation.discount.amount * quantity;
      }

      if (discountCents > subtotalCents) {
        discountCents = subtotalCents;
      }

      const adjustedTotalCents = Math.max(0, subtotalCents - discountCents);

      couponDiscountCents = discountCents;
      couponSubtotalCents = subtotalCents;
      couponAdjustedTotalCents = adjustedTotalCents;
      couponOriginalUnitAmount = unitAmount;

      const adjustedUnitAmount = Math.floor(adjustedTotalCents / quantity);
      const remainder = adjustedTotalCents - adjustedUnitAmount * quantity;
      couponAdjustedUnitAmount = adjustedUnitAmount;

      if (!couponValidation.stripePromotionCode) {
        const baseProductName = offer.productName ?? currentProduct?.name ?? offer.id;
        const baseDescription = offer.productDescription ?? currentProduct?.description ?? undefined;
        const imageCandidates = [
          offer.productImage,
          ...(currentProduct?.images ?? []),
        ].filter((value): value is string => Boolean(value && value.length > 0));
        const productImages = imageCandidates.length > 0 ? Array.from(new Set(imageCandidates)).slice(0, 8) : undefined;

        const productDataBase: Stripe.Checkout.SessionCreateParams.LineItem.PriceData.ProductData = {
          name: baseProductName,
        };

        if (baseDescription) {
          productDataBase.description = baseDescription;
        }

        if (productImages && productImages.length > 0) {
          productDataBase.images = productImages;
        }

        productDataBase.metadata = {
          base_price_id: price.id,
          coupon_code: normalizedCouponCode ?? "",
        };

        const buildPriceData = (unit: number): Stripe.Checkout.SessionCreateParams.LineItem.PriceData => ({
          currency: price.currency ?? "usd",
          unit_amount: unit,
          product_data: {
            ...productDataBase,
            metadata: {
              ...productDataBase.metadata,
              unit_amount_cents: String(unit),
            },
          },
          ...(price.tax_behavior ? { tax_behavior: price.tax_behavior } : {}),
        });

        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
        const baseQuantity = quantity - remainder;

        if (baseQuantity > 0) {
          lineItems.push({
            price_data: buildPriceData(adjustedUnitAmount),
            quantity: baseQuantity,
          });
        }

        if (remainder > 0) {
          lineItems.push({
            price_data: buildPriceData(adjustedUnitAmount + 1),
            quantity: remainder,
          });
        }

        if (lineItems.length === 0) {
          lineItems.push({
            price_data: buildPriceData(adjustedTotalCents),
            quantity: 1,
          });
        }

        customLineItems = lineItems;
      }
    }

    if (couponDiscountCents !== undefined) {
      const discountStr = String(couponDiscountCents);
      metadataFromRequest.couponDiscountCents = discountStr;
      sessionMetadata.couponDiscountCents = discountStr;
    }

    if (couponSubtotalCents !== undefined) {
      const subtotalStr = String(couponSubtotalCents);
      metadataFromRequest.couponSubtotalCents = subtotalStr;
      sessionMetadata.couponSubtotalCents = subtotalStr;
    }

    if (couponAdjustedTotalCents !== undefined) {
      const adjustedTotalStr = String(couponAdjustedTotalCents);
      metadataFromRequest.couponAdjustedTotalCents = adjustedTotalStr;
      sessionMetadata.couponAdjustedTotalCents = adjustedTotalStr;
    }

    if (couponOriginalUnitAmount !== undefined) {
      const originalUnitStr = String(couponOriginalUnitAmount);
      metadataFromRequest.couponOriginalUnitCents = originalUnitStr;
      sessionMetadata.couponOriginalUnitCents = originalUnitStr;
    }

    if (couponAdjustedUnitAmount !== undefined) {
      const adjustedUnitStr = String(couponAdjustedUnitAmount);
      metadataFromRequest.couponAdjustedUnitCents = adjustedUnitStr;
      sessionMetadata.couponAdjustedUnitCents = adjustedUnitStr;
    }

    if (normalizedCouponCode) {
      metadataFromRequest.couponSource = couponValidation?.stripePromotionCode ? "stripe" : "local";
      sessionMetadata.couponSource = metadataFromRequest.couponSource;
    }

    parsedBody.metadata = metadataFromRequest;

    // Configure payment methods - two options:
    // Option 1: Use a payment configuration ID (manages all payment methods in Stripe Dashboard)
    // Option 2: Specify payment_method_types directly (manual control)

    const paymentConfigId = getOptionalStripePaymentConfigId();

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = customLineItems ?? [
      {
        price: price.id,
        quantity: parsedBody.quantity,
      },
    ];

    let sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode,
      client_reference_id: parsedBody.clientReferenceId,
      line_items: lineItems,
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
