import Stripe from "stripe";

const apiVersion: Stripe.StripeConfig["apiVersion"] = "2024-04-10";

let stripeClientAuto: Stripe | undefined;
let stripeClientLive: Stripe | null | undefined;
let stripeClientTest: Stripe | null | undefined;

function createStripeClient(secret: string | undefined | null): Stripe | null {
  if (!secret) {
    return null;
  }

  return new Stripe(secret, { apiVersion });
}

function resolveStripeSecret(): string {
  const secret = process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY_TEST;
  if (!secret) {
    throw new Error("Stripe secret key is not configured. Set STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST.");
  }

  return secret;
}

export function getStripeClient(mode: "auto" | "live" | "test" = "auto"): Stripe {
  if (mode === "auto") {
    if (!stripeClientAuto) {
      stripeClientAuto = new Stripe(resolveStripeSecret(), { apiVersion });
    }

    return stripeClientAuto;
  }

  if (mode === "live") {
    if (stripeClientLive === undefined) {
      stripeClientLive = createStripeClient(process.env.STRIPE_SECRET_KEY);
    }

    if (!stripeClientLive) {
      throw new Error("Live Stripe key (STRIPE_SECRET_KEY) is not configured.");
    }

    return stripeClientLive;
  }

  if (stripeClientTest === undefined) {
    stripeClientTest = createStripeClient(process.env.STRIPE_SECRET_KEY_TEST ?? process.env.STRIPE_SECRET_KEY);
  }

  if (!stripeClientTest) {
    throw new Error("Test Stripe key (STRIPE_SECRET_KEY_TEST) is not configured.");
  }

  return stripeClientTest;
}