import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { getAccountFromSessionCookie } from "@/lib/account/service";
import { findRecentOrdersByEmail, type OrderRecord } from "@/lib/checkout";
import { getStripeClient } from "@/lib/payments/stripe";
import { getStripeMode } from "@/lib/payments/stripe-environment";
import { ROUTES } from "@/lib/routes";
import { getSiteBaseUrl } from "@/lib/urls";
import logger from "@/lib/logger";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function normalizeParam(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function isTrustedEnvironment(): boolean {
  const deploymentEnv = process.env.VERCEL_ENV ?? "development";
  const isLocalStack = process.env.NODE_ENV !== "production" && !process.env.VERCEL_ENV;
  const isPreview = deploymentEnv === "preview";
  const isStaging = deploymentEnv === "staging";
  return isLocalStack || isPreview || isStaging;
}

async function resolveAdminImpersonation(
  request: NextRequest,
): Promise<{ email: string; adminTokenSatisfied: boolean } | null> {
  let body: Record<string, unknown> | null = null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }

  if (!body) {
    return null;
  }

  const impersonateParam =
    normalizeParam(body.impersonateEmail as string | undefined) ??
    normalizeParam(body.impersonate as string | undefined) ??
    normalizeParam(body.impersonate_email as string | undefined);
  const adminTokenParam =
    normalizeParam(body.adminToken as string | undefined) ??
    normalizeParam(body.admin_token as string | undefined) ??
    normalizeParam(body.admintoken as string | undefined);

  if (!impersonateParam) {
    return null;
  }

  const adminTokenEnv = normalizeParam(process.env.ACCOUNT_ADMIN_TOKEN);
  const adminTokenSatisfied =
    Boolean(adminTokenEnv) &&
    (adminTokenParam === adminTokenEnv || isTrustedEnvironment());

  return {
    email: impersonateParam,
    adminTokenSatisfied,
  };
}

function buildReturnUrl(): string {
  return `${getSiteBaseUrl()}${ROUTES.account}`;
}

function resolveBillingPortalConfigurationId(order: OrderRecord): string | null {
  const mode = getStripeMode(order.providerMode ?? "auto");
  const envValue =
    mode === "live"
      ? process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID_LIVE ??
        process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID
      : process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID_TEST ??
        process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;

  if (!envValue) {
    return null;
  }

  const trimmed = envValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isStripeOrder(order: OrderRecord): boolean {
  return order.source === "stripe" || order.paymentProvider === "stripe";
}

function findStripeOrder(orders: OrderRecord[]): OrderRecord | null {
  for (const order of orders) {
    if (!isStripeOrder(order)) {
      continue;
    }

    if (
      order.stripeSessionId ||
      order.providerSessionId ||
      order.stripePaymentIntentId ||
      order.providerPaymentId ||
      order.stripeChargeId ||
      order.providerChargeId
    ) {
      return order;
    }
  }

  return null;
}

async function resolveCustomerFromCheckoutSession(
  stripe: ReturnType<typeof getStripeClient>,
  sessionId: string,
): Promise<string | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["customer"] });
    if (typeof session.customer === "string") {
      return session.customer;
    }
    return session.customer?.id ?? null;
  } catch (error) {
    logger.warn("account.billing_portal_session_lookup_failed", {
      sessionId,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
    return null;
  }
}

async function resolveCustomerFromPaymentIntent(
  stripe: ReturnType<typeof getStripeClient>,
  paymentIntentId: string,
): Promise<string | null> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (typeof paymentIntent.customer === "string") {
      return paymentIntent.customer;
    }
    return paymentIntent.customer?.id ?? null;
  } catch (error) {
    logger.warn("account.billing_portal_payment_intent_lookup_failed", {
      paymentIntentId,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
    return null;
  }
}

async function resolveCustomerFromCharge(
  stripe: ReturnType<typeof getStripeClient>,
  chargeId: string,
): Promise<string | null> {
  try {
    const charge = await stripe.charges.retrieve(chargeId);
    if (typeof charge.customer === "string") {
      return charge.customer;
    }
    return charge.customer?.id ?? null;
  } catch (error) {
    logger.warn("account.billing_portal_charge_lookup_failed", {
      chargeId,
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
    return null;
  }
}

async function resolveStripeCustomerId(
  stripe: ReturnType<typeof getStripeClient>,
  order: OrderRecord,
): Promise<string | null> {
  const sessionId = order.stripeSessionId ?? order.providerSessionId ?? null;
  if (sessionId) {
    const customerId = await resolveCustomerFromCheckoutSession(stripe, sessionId);
    if (customerId) {
      return customerId;
    }
  }

  const paymentIntentId = order.stripePaymentIntentId ?? order.providerPaymentId ?? null;
  if (paymentIntentId) {
    const customerId = await resolveCustomerFromPaymentIntent(stripe, paymentIntentId);
    if (customerId) {
      return customerId;
    }
  }

  const chargeId = order.stripeChargeId ?? order.providerChargeId ?? null;
  if (chargeId) {
    const customerId = await resolveCustomerFromCharge(stripe, chargeId);
    if (customerId) {
      return customerId;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get("store_account_session")?.value ?? null;

  let accountEmail: string | null = null;
  let usedAdminBypass = false;

  if (sessionCookie) {
    const account = await getAccountFromSessionCookie(sessionCookie);
    if (!account) {
      return json({ error: "Session expired" }, 401);
    }
    accountEmail = account.email;
  } else {
    const adminImpersonation = await resolveAdminImpersonation(request);
    if (!adminImpersonation?.adminTokenSatisfied) {
      return json({ error: "Not signed in" }, 401);
    }
    accountEmail = adminImpersonation.email;
    usedAdminBypass = true;
  }

  if (!accountEmail) {
    return json({ error: "Not signed in" }, 401);
  }

  const orders = await findRecentOrdersByEmail(accountEmail, 25);
  const order = findStripeOrder(orders);

  if (!order) {
    return json({ error: "No Stripe billing history found for this account." }, 404);
  }

  try {
    const stripe = getStripeClient({
      mode: order.providerMode ?? "auto",
      accountAlias: order.providerAccountAlias ?? undefined,
    });

    const customerId = await resolveStripeCustomerId(stripe, order);

    if (!customerId) {
      logger.warn("account.billing_portal_missing_customer", {
        orderId: order.id,
        stripeSessionId: order.stripeSessionId ?? null,
        paymentIntentId: order.stripePaymentIntentId ?? null,
        stripeChargeId: order.stripeChargeId ?? null,
      });
      return json({ error: "Stripe customer not found for this account." }, 404);
    }

    const returnUrl = buildReturnUrl();
    const configurationId = resolveBillingPortalConfigurationId(order);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
      ...(configurationId ? { configuration: configurationId } : {}),
    } as Stripe.BillingPortal.SessionCreateParams);

    if (!portalSession.url) {
      return json({ error: "Unable to open billing portal right now." }, 502);
    }

    if (usedAdminBypass) {
      logger.info("account.billing_portal_admin_impersonation", {
        email: accountEmail,
        orderId: order.id,
      });
    }

    return json({ url: portalSession.url });
  } catch (error) {
    logger.error("account.billing_portal_create_failed", {
      error: error instanceof Error ? { message: error.message, name: error.name } : error,
    });
    return json({ error: "Unable to open billing portal right now." }, 502);
  }
}
