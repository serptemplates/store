import type { PaymentConfig, PaymentProviderId } from "@/lib/products/payment";

export type OptionalItemInput = {
  productId: string;
  priceId?: string;
  quantity?: number;
};

export type CheckoutFeatures = {
  allowPromotionCodes?: boolean;
  allowOptionalItems?: boolean;
  sendReceiptEmail?: boolean;
};

export type CheckoutRequest = {
  slug: string;
  mode: "payment" | "subscription";
  quantity: number;
  metadata: Record<string, string>;
  customerEmail?: string;
  clientReferenceId?: string | null;
  successUrl: string;
  cancelUrl: string;
  price?: {
    id: string;
    productName?: string | null;
    productDescription?: string | null;
    productImage?: string | null;
  };
  optionalItems?: OptionalItemInput[];
  paymentAccountAlias?: string | null;
  providerConfig?: PaymentConfig;
  features?: CheckoutFeatures;
};

export type CheckoutResponse = {
  redirectUrl: string;
  sessionId: string;
  providerSessionId: string;
  provider: PaymentProviderId;
};

export type ProviderContext = {
  accountAlias?: string | null;
};

export type NormalizedCheckoutSession = {
  id: string;
  provider: PaymentProviderId;
  providerSessionId: string;
  data: unknown;
};

export type NormalizedCheckoutEvent = {
  id: string;
  provider: PaymentProviderId;
  type: string;
  data: unknown;
};

export interface PaymentProviderAdapter {
  id: PaymentProviderId;
  createCheckout(request: CheckoutRequest): Promise<CheckoutResponse>;
  retrieveSession?(sessionId: string, context: ProviderContext): Promise<NormalizedCheckoutSession>;
  handleWebhook?(event: unknown, context: ProviderContext): Promise<NormalizedCheckoutEvent>;
}
