import { isStripeTestMode } from "@/lib/payments/stripe-environment";
import type {
  CheckoutRequest,
  CheckoutResponse,
  NormalizedCheckoutEvent,
  PaymentProviderAdapter,
} from "@/lib/payments/providers/base";

type WhopEnvironmentConfig = {
  listing_id?: string;
  plan_id?: string;
  offer_id?: string;
  product_id?: string;
  checkout_url?: string;
};

function resolveEnvironmentConfig(config: { live?: WhopEnvironmentConfig; test?: WhopEnvironmentConfig }) {
  const isTest = isStripeTestMode();
  return isTest ? config.test ?? config.live : config.live ?? config.test;
}

function resolveCheckoutUrl(envConfig: WhopEnvironmentConfig | undefined): string | null {
  if (envConfig?.checkout_url && envConfig.checkout_url.trim().length > 0) {
    return envConfig.checkout_url.trim();
  }
  return null;
}

function fallbackSessionId(envConfig: WhopEnvironmentConfig | undefined, slug: string): string {
  return (
    envConfig?.offer_id ??
    envConfig?.plan_id ??
    envConfig?.listing_id ??
    envConfig?.product_id ??
    `whop_${slug}_${Date.now()}`
  );
}

export const whopCheckoutAdapter: PaymentProviderAdapter = {
  id: "whop",
  async createCheckout(request: CheckoutRequest): Promise<CheckoutResponse> {
    const providerConfig = request.providerConfig?.whop;
    if (!providerConfig) {
      throw new Error("Whop provider metadata is missing from the product configuration.");
    }

    const envConfig = resolveEnvironmentConfig({
      live: providerConfig.live,
      test: providerConfig.test,
    });

    const checkoutUrl = resolveCheckoutUrl(envConfig);
    if (!checkoutUrl) {
      throw new Error("Whop checkout_url must be configured for the selected environment.");
    }

    const sessionId = fallbackSessionId(envConfig, request.slug);

    return {
      provider: "whop",
      redirectUrl: checkoutUrl,
      sessionId,
      providerSessionId: sessionId,
    };
  },
  async handleWebhook(event: unknown): Promise<NormalizedCheckoutEvent> {
    const rawEvent = (event as Record<string, unknown>) ?? {};
    const id =
      typeof rawEvent.id === "string" && rawEvent.id.trim().length > 0
        ? rawEvent.id
        : `whop_evt_${Date.now()}`;
    const type =
      typeof rawEvent.type === "string" && rawEvent.type.trim().length > 0
        ? rawEvent.type
        : "whop.event";

    return {
      id,
      provider: "whop",
      type,
      data: event,
    };
  },
};
