import type { CheckoutRequest, CheckoutResponse, PaymentProviderAdapter } from "@/lib/payments/providers/base";
import type { PaymentProviderId } from "@/lib/products/payment";

export function createPlaceholderAdapter(
  provider: PaymentProviderId,
  message: string,
): PaymentProviderAdapter {
  return {
    id: provider,
    async createCheckout(_request: CheckoutRequest): Promise<CheckoutResponse> {
      throw new Error(message);
    },
  };
}
