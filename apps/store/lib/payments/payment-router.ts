import type { CheckoutFeatures, CheckoutResponse, OptionalItemInput } from "@/lib/payments/providers/base";
import type { PaymentProviderId } from "@/lib/products/payment";
import type { OfferConfig } from "@/lib/products/offer-config";
import { stripeCheckoutAdapter } from "@/lib/payments/providers/stripe/checkout";
import { whopCheckoutAdapter } from "@/lib/payments/providers/whop/checkout";
import { easyPayDirectCheckoutAdapter } from "@/lib/payments/providers/easy-pay-direct/checkout";
import { lemonSqueezyCheckoutAdapter } from "@/lib/payments/providers/lemonsqueezy/checkout";
import { paypalCheckoutAdapter } from "@/lib/payments/providers/paypal/checkout";
import type { PaymentProviderAdapter } from "@/lib/payments/providers/base";

const ADAPTERS: Partial<Record<PaymentProviderId, PaymentProviderAdapter>> = {
  stripe: stripeCheckoutAdapter,
  whop: whopCheckoutAdapter,
  easy_pay_direct: easyPayDirectCheckoutAdapter,
  lemonsqueezy: lemonSqueezyCheckoutAdapter,
  paypal: paypalCheckoutAdapter,
};

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

function getAdapter(provider: PaymentProviderId): PaymentProviderAdapter {
  const adapter = ADAPTERS[provider];
  if (adapter) {
    return adapter;
  }
  throw new Error(`Payment provider ${provider} is not supported yet.`);
}

export async function createCheckoutSessionForOffer(input: CheckoutRouterInput): Promise<CheckoutResponse> {
  const provider = input.offer.payment?.provider ?? "stripe";
  const adapter = getAdapter(provider);
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
