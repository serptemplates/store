import { NextRequest, NextResponse } from "next/server";

import { getOfferConfig } from "@/lib/products/offer-config";
import { getProductData } from "@/lib/products/product";
import { getStripeClient } from "@/lib/payments/stripe";
import { checkoutRateLimit, withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import {
  applyCouponIfPresent,
  createStripeCheckoutSession,
  parseCheckoutRequest,
  persistCheckoutSession,
} from "@/lib/checkout/session";


function buildErrorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  return withRateLimit(request, checkoutRateLimit, async () => {
    const validationResult = await parseCheckoutRequest(request);

    if (!validationResult.ok) {
      return buildErrorResponse(validationResult.message, validationResult.status);
    }

    const { body, metadata } = validationResult.value;
    const couponResult = await applyCouponIfPresent(body, metadata);

    if (!couponResult.ok) {
      return buildErrorResponse(couponResult.message);
    }

    const metadataFromRequest = couponResult.metadata;

    if (couponResult.couponCode) {
      body.couponCode = couponResult.couponCode;
    }

    body.metadata = metadataFromRequest;

    const offer = getOfferConfig(body.offerId);

    let product;
    try {
      product = getProductData(body.offerId);
    } catch (error) {
      return buildErrorResponse(`Offer ${body.offerId} is not recognized`, 404);
    }

    if (!offer) {
      try {
        const { createSimpleCheckout } = await import("@/lib/checkout/simple-checkout");
        const session = await createSimpleCheckout({
          offerId: body.offerId,
          quantity: body.quantity,
          metadata: body.metadata,
          customer: body.customer,
          affiliateId: body.affiliateId,
          orderBump: body.orderBump,
        });

        void persistCheckoutSession({
          stripeSessionId: session.id,
          paymentIntentId: (session.payment_intent as string | null) ?? null,
          offerId: body.offerId,
          landerId: body.offerId,
          customerEmail: body.customer?.email ?? null,
          metadata: metadataFromRequest,
        });

        return NextResponse.json({
          id: session.id,
          url: session.url,
        });
      } catch (error) {
        logger.error("checkout.simple_failed", {
          error: error instanceof Error ? error.message : String(error),
        });

        return buildErrorResponse(`Checkout failed: ${(error as Error).message}`, 502);
      }
    }

    const stripe = getStripeClient();

    const sessionMetadata: Record<string, string> = { ...metadataFromRequest };

    try {
      const pricingResult = await createStripeCheckoutSession(stripe, {
        offer,
        payload: body,
        metadata: metadataFromRequest,
        sessionMetadata,
        coupon: couponResult,
        product,
      });

      void persistCheckoutSession({
        stripeSessionId: pricingResult.session.id,
        offerId: offer.id,
        landerId: pricingResult.landerId,
        paymentIntentId: pricingResult.paymentIntentId,
        customerEmail: body.customer?.email ?? null,
        metadata: metadataFromRequest,
      });

      if (body.uiMode === "embedded") {
        return NextResponse.json({
          id: pricingResult.session.id,
          client_secret: pricingResult.session.client_secret,
          status: pricingResult.session.payment_status,
          mode: pricingResult.session.mode,
        });
      }

      return NextResponse.json({
        id: pricingResult.session.id,
        url: pricingResult.session.url,
        status: pricingResult.session.payment_status,
        mode: pricingResult.session.mode,
      });
    } catch (error) {
      if (error && typeof error === "object" && "message" in error) {
        return buildErrorResponse(`Stripe error: ${String(error.message)}`, 502);
      }

      return buildErrorResponse("Unexpected error while creating checkout session", 500);
    }
  });
}

export const runtime = "nodejs";
