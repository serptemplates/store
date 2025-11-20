import { createPlaceholderAdapter } from "@/lib/payments/providers/placeholder-adapter";

export const lemonSqueezyCheckoutAdapter = createPlaceholderAdapter(
  "lemonsqueezy",
  "Lemon Squeezy adapter is not implemented yet. Switch payment.provider back to Stripe or Whop until Lemon Squeezy integration is complete.",
);
