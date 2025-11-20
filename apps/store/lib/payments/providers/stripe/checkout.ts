import Stripe from "stripe";

import logger from "@/lib/logger";
import { getStripeClient, resolvePriceForEnvironment } from "@/lib/payments/stripe";
import type {
  CheckoutRequest,
  CheckoutResponse,
  OptionalItemInput,
  PaymentProviderAdapter,
} from "@/lib/payments/providers/base";

type CheckoutOptionalItem = {
  price: string;
  quantity: number;
  adjustable_quantity?: Stripe.Checkout.SessionCreateParams.LineItem.AdjustableQuantity;
};

const OPTIONAL_ITEM_ADJUSTABLE_QUANTITY: Stripe.Checkout.SessionCreateParams.LineItem.AdjustableQuantity = {
  enabled: true,
  minimum: 0,
  maximum: 1,
};

async function buildOptionalItems(
  items: OptionalItemInput[] | undefined,
  context: { slug: string; accountAlias?: string | null },
): Promise<CheckoutOptionalItem[]> {
  if (!items || items.length === 0) {
    return [];
  }

  const optionalItems: CheckoutOptionalItem[] = [];
  for (const optionalItem of items) {
    try {
      const liveStripe = getStripeClient({ mode: "live", accountAlias: context.accountAlias ?? undefined });
      const product = await liveStripe.products.retrieve(optionalItem.productId);

      const priceIdFromOffer = optionalItem.priceId;
      const priceIdToResolve =
        priceIdFromOffer ??
        (typeof product.default_price === "string"
          ? product.default_price
          : product.default_price?.id);

      if (!priceIdToResolve) {
        logger.warn("checkout.optional_item_no_default_price", {
          slug: context.slug,
          productId: optionalItem.productId,
        });
        continue;
      }

      const optionalPrice = await resolvePriceForEnvironment(
        {
          id: optionalItem.productId,
          priceId: priceIdToResolve,
          productName: product.name,
          productDescription: product.description ?? undefined,
          productImage: product.images?.[0] ?? undefined,
        },
        { syncWithLiveProduct: true, accountAlias: context.accountAlias ?? undefined },
      );

      optionalItems.push({
        price: optionalPrice.id,
        quantity: optionalItem.quantity ?? 1,
        adjustable_quantity: OPTIONAL_ITEM_ADJUSTABLE_QUANTITY,
      });
    } catch (error) {
      logger.warn("checkout.optional_item_price_unavailable", {
        slug: context.slug,
        productId: optionalItem.productId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return optionalItems;
}

export const stripeCheckoutAdapter: PaymentProviderAdapter = {
  id: "stripe",
  async createCheckout(request: CheckoutRequest): Promise<CheckoutResponse> {
    if (!request.price?.id) {
      throw new Error("Stripe checkout requires a price ID.");
    }

    const allowPromotionCodes = request.features?.allowPromotionCodes ?? true;
    const allowOptionalItems = request.features?.allowOptionalItems ?? true;
    const sendReceiptEmail = request.features?.sendReceiptEmail ?? true;

    const resolvedPrice = await resolvePriceForEnvironment(
      {
        id: request.slug,
        priceId: request.price.id,
        productName: request.price.productName ?? null,
        productDescription: request.price.productDescription ?? null,
        productImage: request.price.productImage ?? null,
      },
      { accountAlias: request.paymentAccountAlias ?? undefined },
    );

    const adjustableQuantity: Stripe.Checkout.SessionCreateParams.LineItem.AdjustableQuantity = {
      enabled: true,
      minimum: 0,
      maximum: Math.max(request.quantity, 99),
    };

    const optionalItems =
      allowOptionalItems && request.optionalItems?.length
        ? await buildOptionalItems(request.optionalItems, {
            slug: request.slug,
            accountAlias: request.paymentAccountAlias ?? undefined,
          })
        : [];

    const params: Stripe.Checkout.SessionCreateParams & {
      optional_items?: CheckoutOptionalItem[];
    } = {
      mode: request.mode,
      allow_promotion_codes: allowPromotionCodes,
      line_items: [
        {
          price: resolvedPrice.id,
          quantity: request.quantity,
          adjustable_quantity: adjustableQuantity,
        },
      ],
      success_url: request.successUrl,
      cancel_url: request.cancelUrl,
      metadata: request.metadata,
      consent_collection: {
        terms_of_service: "required",
      },
      customer_creation: "always",
    };

    if (optionalItems.length > 0) {
      params.optional_items = optionalItems;
    }

    if (request.customerEmail) {
      params.customer_email = request.customerEmail;
    }

    if (request.clientReferenceId) {
      params.client_reference_id = request.clientReferenceId;
    }

    if (request.mode === "payment") {
      params.payment_intent_data = {
        metadata: request.metadata,
        description: request.price.productName ?? undefined,
        ...(sendReceiptEmail && request.customerEmail ? { receipt_email: request.customerEmail } : {}),
      };
    }

    if (request.mode === "subscription") {
      params.subscription_data = {
        metadata: request.metadata,
      } as Stripe.Checkout.SessionCreateParams.SubscriptionData;
    }

    const stripe = getStripeClient({ accountAlias: request.paymentAccountAlias ?? undefined });
    const session = await stripe.checkout.sessions.create(params);
    const url = session.url ?? null;
    if (!url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return {
      provider: "stripe",
      redirectUrl: url,
      sessionId: session.id,
      providerSessionId: session.id,
    };
  },
};
