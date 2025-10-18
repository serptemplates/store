import type Stripe from "stripe";

import { getStripeClient, isUsingTestKeys, resolvePriceForEnvironment } from "@/lib/payments/stripe";
import { getOptionalStripePaymentConfigId } from "@/lib/payments/stripe-environment";
import logger from "@/lib/logger";
import type { OfferConfig } from "@/lib/products/offer-config";
import type { ProductData } from "@/lib/products/product-schema";
import { resolveOrderBump } from "@/lib/products/order-bump";

import type { CouponSuccess } from "./coupons";
import type { CheckoutSessionPayload } from "./validation";

export interface StripeCheckoutBuildContext {
  offer: OfferConfig;
  payload: CheckoutSessionPayload;
  metadata: Record<string, string>;
  sessionMetadata: Record<string, string>;
  coupon: CouponSuccess;
  product: ProductData;
}

export interface StripeCheckoutBuildResult {
  session: Stripe.Checkout.Session;
  metadata: Record<string, string>;
  sessionMetadata: Record<string, string>;
  landerId: string;
  paymentIntentId: string | null;
}

export async function createStripeCheckoutSession(
  stripe: Stripe,
  { offer, payload, metadata, sessionMetadata, coupon, product }: StripeCheckoutBuildContext,
): Promise<StripeCheckoutBuildResult> {
  const mode = payload.mode ?? offer.mode;

  const landerId =
    metadata.landerId
      ?? offer.metadata?.landerId
      ?? offer.metadata?.productSlug
      ?? offer.id;

  if (offer.metadata) {
    for (const [key, value] of Object.entries(offer.metadata)) {
      if (metadata[key] === undefined && typeof value === "string") {
        metadata[key] = value;
      }
    }
  }

  metadata.offerId = offer.id;
  metadata.landerId = landerId;
  metadata.environment = isUsingTestKeys() ? "test" : "live";

  if (offer.metadata) {
    for (const [key, value] of Object.entries(offer.metadata)) {
      if (sessionMetadata[key] === undefined && typeof value === "string") {
        sessionMetadata[key] = value;
      }
    }
  }

  sessionMetadata.offerId = offer.id;
  sessionMetadata.landerId = landerId;
  sessionMetadata.environment = isUsingTestKeys() ? "test" : "live";
  sessionMetadata.checkoutSource = metadata.checkoutSource;
  sessionMetadata.termsAccepted = metadata.termsAccepted;
  sessionMetadata.termsAcceptedAt = metadata.termsAcceptedAt;

  if (payload.clientReferenceId) {
    sessionMetadata.clientReferenceId = payload.clientReferenceId;
  }

  if (payload.affiliateId) {
    sessionMetadata.affiliateId = payload.affiliateId;
  }

  const resolvedOrderBump = resolveOrderBump(product);
  const isOrderBumpSelected = Boolean(
    payload.orderBump?.selected &&
      resolvedOrderBump &&
      payload.orderBump.id === resolvedOrderBump.id,
  );

  let orderBumpLineItem: Stripe.Checkout.SessionCreateParams.LineItem | null = null;
  let orderBumpUnitAmount: number | null = null;

  if (payload.orderBump?.selected && !resolvedOrderBump) {
    logger.warn("checkout.order_bump_missing", {
      offerId: offer.id,
      requestedOrderBumpId: payload.orderBump.id,
    });
  }

  if (resolvedOrderBump) {
    metadata.orderBumpId = resolvedOrderBump.id;
    sessionMetadata.orderBumpId = resolvedOrderBump.id;
    metadata.orderBumpTitle = resolvedOrderBump.title;
    sessionMetadata.orderBumpTitle = resolvedOrderBump.title;
    const displayPrice = resolvedOrderBump.priceDisplay ?? resolvedOrderBump.price;
    if (displayPrice) {
      metadata.orderBumpDisplayPrice = displayPrice;
      sessionMetadata.orderBumpDisplayPrice = displayPrice;
    }
    metadata.orderBumpSelected = isOrderBumpSelected ? "true" : "false";
    sessionMetadata.orderBumpSelected = isOrderBumpSelected ? "true" : "false";
  } else {
    metadata.orderBumpSelected = metadata.orderBumpSelected ?? "false";
    sessionMetadata.orderBumpSelected = sessionMetadata.orderBumpSelected ?? "false";
  }

  const price = await resolvePriceForEnvironment({
    id: offer.id,
    priceId: offer.stripePriceId,
    productName: offer.productName,
    productDescription: offer.productDescription,
    productImage: offer.productImage,
  });

  const quantity = payload.quantity;
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

  if (coupon.couponValidation?.discount && unitAmount === null) {
    throw new Error("Unable to apply coupon to this price");
  }

  let customLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] | null = null;
  let couponDiscountCents: number | undefined;
  let couponSubtotalCents: number | undefined;
  let couponAdjustedTotalCents: number | undefined;
  let couponOriginalUnitAmount: number | undefined;
  let couponAdjustedUnitAmount: number | undefined;

  if (coupon.couponValidation?.discount && unitAmount !== null) {
    const subtotalCents = unitAmount * quantity;
    let discountCents = 0;

    if (coupon.couponValidation.discount.type === "percentage") {
      discountCents = Math.round(subtotalCents * (coupon.couponValidation.discount.amount / 100));
    } else {
      discountCents = coupon.couponValidation.discount.amount * quantity;
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

    if (!coupon.couponValidation.stripePromotionCode) {
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
        coupon_code: coupon.couponCode ?? "",
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
    metadata.couponDiscountCents = discountStr;
    sessionMetadata.couponDiscountCents = discountStr;
  }

  if (couponSubtotalCents !== undefined) {
    const subtotalStr = String(couponSubtotalCents);
    metadata.couponSubtotalCents = subtotalStr;
    sessionMetadata.couponSubtotalCents = subtotalStr;
  }

  if (couponAdjustedTotalCents !== undefined) {
    const adjustedTotalStr = String(couponAdjustedTotalCents);
    metadata.couponAdjustedTotalCents = adjustedTotalStr;
    sessionMetadata.couponAdjustedTotalCents = adjustedTotalStr;
  }

  if (couponOriginalUnitAmount !== undefined) {
    const originalUnitStr = String(couponOriginalUnitAmount);
    metadata.couponOriginalUnitCents = originalUnitStr;
    sessionMetadata.couponOriginalUnitCents = originalUnitStr;
  }

  if (couponAdjustedUnitAmount !== undefined) {
    const adjustedUnitStr = String(couponAdjustedUnitAmount);
    metadata.couponAdjustedUnitCents = adjustedUnitStr;
    sessionMetadata.couponAdjustedUnitCents = adjustedUnitStr;
  }

  if (coupon.couponCode) {
    metadata.couponSource = coupon.couponValidation?.stripePromotionCode ? "stripe" : "local";
    sessionMetadata.couponSource = metadata.couponSource;
  }

  if (isOrderBumpSelected && resolvedOrderBump) {
    let orderBumpPriceId = resolvedOrderBump.stripePriceId;
    if (isUsingTestKeys() && resolvedOrderBump.stripeTestPriceId) {
      orderBumpPriceId = resolvedOrderBump.stripeTestPriceId;
    }

    const orderBumpPrice = await resolvePriceForEnvironment({
      id: `${offer.id}__order_bump_${resolvedOrderBump.id}`,
      priceId: orderBumpPriceId,
      productName: `${resolvedOrderBump.title} (Upgrade)`,
      productDescription: resolvedOrderBump.description ?? undefined,
      productImage: offer.productImage,
    });

    orderBumpUnitAmount =
      typeof orderBumpPrice.unit_amount === "number"
        ? orderBumpPrice.unit_amount
        : typeof orderBumpPrice.unit_amount_decimal === "string"
          ? Math.round(Number(orderBumpPrice.unit_amount_decimal))
          : null;

    if (orderBumpUnitAmount === null) {
      throw new Error("Order bump price must include a fixed unit amount");
    }

    orderBumpLineItem = {
      price: orderBumpPrice.id,
      quantity: 1,
    };

    metadata.orderBumpUnitCents = String(orderBumpUnitAmount);
    metadata.orderBumpPriceId = orderBumpPrice.id;
    sessionMetadata.orderBumpUnitCents = String(orderBumpUnitAmount);
    sessionMetadata.orderBumpPriceId = orderBumpPrice.id;

    if (!metadata.orderBumpDisplayPrice) {
      const fallbackDisplay =
        resolvedOrderBump.priceDisplay ??
        resolvedOrderBump.price ??
        (typeof orderBumpPrice.unit_amount === "number"
          ? `$${(orderBumpPrice.unit_amount / 100).toFixed(2)}`
          : orderBumpPrice.unit_amount_decimal ?? undefined);
      if (fallbackDisplay) {
        metadata.orderBumpDisplayPrice = fallbackDisplay;
        sessionMetadata.orderBumpDisplayPrice = fallbackDisplay;
      }
    }
  } else {
    metadata.orderBumpUnitCents = metadata.orderBumpUnitCents ?? "0";
    sessionMetadata.orderBumpUnitCents = sessionMetadata.orderBumpUnitCents ?? "0";
  }

  if (orderBumpUnitAmount !== null && unitAmount !== null) {
    const baseSubtotalCents = couponAdjustedTotalCents ?? unitAmount * quantity;
    const combinedTotalCents = baseSubtotalCents + orderBumpUnitAmount;
    metadata.checkoutTotalWithOrderBumpCents = String(combinedTotalCents);
    sessionMetadata.checkoutTotalWithOrderBumpCents = String(combinedTotalCents);
  }

  const paymentConfigId = getOptionalStripePaymentConfigId();

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = customLineItems
    ? [...customLineItems]
    : [
        {
          price: price.id,
          quantity,
        },
      ];

  if (orderBumpLineItem) {
    lineItems.push(orderBumpLineItem);
  }

  let sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode,
    client_reference_id: payload.clientReferenceId,
    line_items: lineItems,
    customer_email: payload.customer?.email,
    metadata: sessionMetadata,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    custom_text: {
      submit: {
        message: `Secure checkout for ${offer.productName ?? offer.id}`,
      },
    },
  };

  if (coupon.couponValidation?.stripePromotionCode) {
    sessionParams.discounts = [
      {
        promotion_code: coupon.couponValidation.stripePromotionCode,
      },
    ];
  }

  if (paymentConfigId) {
    logger.debug("checkout.payment_config_used", { paymentConfigId });
    sessionParams.payment_method_configuration = paymentConfigId;
  } else {
    const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = process.env.STRIPE_CHECKOUT_PAYMENT_METHODS
      ? process.env.STRIPE_CHECKOUT_PAYMENT_METHODS.split(",").map((m) => m.trim()) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[]
      : ["card"];

    logger.debug("checkout.payment_methods", { paymentMethodTypes: paymentMethodTypes.join(", ") });
    sessionParams.payment_method_types = paymentMethodTypes;
  }

  if (payload.uiMode !== "embedded") {
    sessionParams.customer_creation = "if_required";
    sessionParams.consent_collection = {
      promotions: "auto",
      terms_of_service: "required",
    };
    sessionParams.phone_number_collection = { enabled: true };
    sessionParams.after_expiration = {
      recovery: {
        enabled: true,
      },
    };
  }

  if (payload.uiMode === "embedded") {
    sessionParams.ui_mode = "embedded";
    sessionParams.return_url = offer.successUrl;
  } else {
    sessionParams.success_url = offer.successUrl;
    sessionParams.cancel_url = offer.cancelUrl;
  }

  const paymentIntentDescription = offer.productName ?? product.name ?? offer.id;
  const paymentIntentMetadata: Stripe.MetadataParam = {};

  const mergeMetadata = (source: Record<string, string>) => {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === "string") {
        paymentIntentMetadata[key] = value;
      }
    }
  };

  mergeMetadata(sessionMetadata);
  mergeMetadata(metadata);

  sessionParams.payment_intent_data = {
    description: paymentIntentDescription,
    metadata: paymentIntentMetadata,
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  return {
    session,
    metadata,
    sessionMetadata,
    landerId,
    paymentIntentId,
  };
}

export function getStripeCheckoutClient(): Stripe {
  return getStripeClient();
}
