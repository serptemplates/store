import "@/lib/payments/package-logger";
import { defaultAdapters, getAdapter as getAdapterFromRegistry } from "@repo/payments";
import type { CheckoutFeatures, CheckoutResponse, OptionalItemInput } from "@/lib/payments/providers/base";
import type { PaymentProviderId } from "@/lib/products/payment";
import type { OfferConfig } from "@/lib/products/offer-config";

type CheckoutRouterInput = {
  offer: OfferConfig;
  quantity: number;
  metadata: Record<string, string>;
  customerEmail?: string;
  clientReferenceId?: string | null;
};

function ensureStripePriceId(offer: OfferConfig): string | undefined {
  if (offer.stripePriceId && offer.stripePriceId.trim().length > 0) {
    return offer.stripePriceId;
  }
  return undefined;
}

function normalizeOptionalItems(offer: OfferConfig): OptionalItemInput[] | undefined {
  if (!offer.optionalItems || offer.optionalItems.length === 0) {
    return undefined;
  }

  return offer.optionalItems.map((item) => ({
    productId: item.product_id,
    priceId: item.price_id,
    quantity: item.quantity,
  }));
}

export async function createCheckoutSessionForOffer(input: CheckoutRouterInput): Promise<CheckoutResponse> {
  const provider = input.offer.payment?.provider ?? "stripe";
  const adapter = getAdapterFromRegistry(provider, defaultAdapters);
  const optionalItems = normalizeOptionalItems(input.offer);
  const stripePriceId = provider === "stripe" ? ensureStripePriceId(input.offer) : undefined;

  if (provider === "stripe" && !stripePriceId) {
    throw new Error(`Offer ${input.offer.id} is missing a configured Stripe price.`);
  }

  const features: CheckoutFeatures = {
    allowPromotionCodes: true,
    allowOptionalItems: true,
    sendReceiptEmail: true,
  };

  return adapter.createCheckout({
    slug: input.offer.id,
    mode: input.offer.payment?.mode ?? input.offer.mode,
    quantity: input.quantity,
    metadata: input.metadata,
    customerEmail: input.customerEmail,
    clientReferenceId: input.clientReferenceId ?? null,
    successUrl: input.offer.successUrl,
    cancelUrl: input.offer.cancelUrl,
    price: stripePriceId
      ? {
          id: stripePriceId,
          productName: input.offer.productName,
          productDescription: input.offer.productDescription,
          productImage: input.offer.productImage,
        }
      : undefined,
    optionalItems,
    paymentAccountAlias: input.offer.payment?.account ?? null,
    providerConfig: input.offer.payment,
    features,
  });
}
