import { createPlaceholderAdapter } from "@/lib/payments/providers/placeholder-adapter";

export const easyPayDirectCheckoutAdapter = createPlaceholderAdapter(
  "easy_pay_direct",
  "Easy Pay Direct adapter is not implemented yet. Configure payment.provider to use Stripe or Whop until this integration ships.",
);
