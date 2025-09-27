import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import type Stripe from "stripe";

import { getOfferConfig } from "@/lib/offer-config";
import { getStripeClient, isUsingTestKeys, resolvePriceForEnvironment } from "@/lib/stripe";
import { markStaleCheckoutSessions, upsertCheckoutSession } from "@/lib/checkout-store";

const requestSchema = z.object({
  offerId: z.string().min(1, "offerId is required"),
  quantity: z.number().int().min(1).max(10).optional().default(1),
  mode: z.enum(["payment", "subscription"]).optional(),
  clientReferenceId: z.string().optional(),
  affiliateId: z.string().min(1).optional(),
  metadata: z.record(z.string()).optional(),
  customer: z
    .object({
      email: z.string().email("Invalid email"),
      name: z.string().max(120).optional(),
      phone: z.string().max(32).optional(),
    })
    .optional(),
});

function buildErrorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  let parsedBody: z.infer<typeof requestSchema>;

  try {
    const json = await request.json();
    parsedBody = requestSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(error.issues.map((issue) => issue.message).join(", "));
    }

    return buildErrorResponse("Invalid request payload");
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
      return buildErrorResponse(`Checkout failed: ${error.message}`, 502);
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

    const paymentMethodTypesRaw =
      process.env.STRIPE_CHECKOUT_PAYMENT_METHODS?.split(",")
        .map((method) => method.trim())
        .filter(Boolean) ?? [];
    const paymentMethodTypes = (paymentMethodTypesRaw.length > 0
      ? paymentMethodTypesRaw
      : ["card"]) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[];

    const session = await stripe.checkout.sessions.create({
      mode,
      payment_method_types: paymentMethodTypes,
      client_reference_id: parsedBody.clientReferenceId,
      success_url: offer.successUrl,
      cancel_url: offer.cancelUrl,
      line_items: [
        {
          price: price.id,
          quantity: parsedBody.quantity,
        },
      ],
      customer_email: parsedBody.customer?.email,
      metadata: sessionMetadata,
      custom_text: {
        submit: {
          message: `Secure checkout for ${offer.productName ?? offer.id}`,
        },
      },
    });

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

    return NextResponse.json({
      id: session.id,
      url: session.url,
      status: session.payment_status,
      mode: session.mode,
    });
  } catch (error) {
    if (error && typeof error === "object" && "message" in error) {
      return buildErrorResponse(`Stripe error: ${String(error.message)}`, 502);
    }

    return buildErrorResponse("Unexpected error while creating checkout session", 500);
  }
}
