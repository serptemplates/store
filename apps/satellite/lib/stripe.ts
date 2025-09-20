import Stripe from "stripe";

const apiVersion: Stripe.StripeConfig["apiVersion"] = "2024-04-10";
let stripeClient: Stripe | undefined;

function resolveStripeSecret(): string {
  const secret = process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY_TEST;
  if (!secret) {
    throw new Error("Stripe secret key is not configured. Set STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST.");
  }
  return secret;
}

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(resolveStripeSecret(), { apiVersion });
  }
  return stripeClient;
}

export function isUsingTestKeys(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY_TEST && !process.env.STRIPE_SECRET_KEY);
}
