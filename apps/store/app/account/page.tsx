import { cookies } from "next/headers";

import AccountDashboard, { type PurchaseSummary } from "@/components/account/AccountDashboard";
import AccountVerificationFlow from "@/components/account/AccountVerificationFlow";
import { getAccountFromSessionCookie } from "@/lib/account/service";
import { findRecentOrdersByEmail, updateOrderMetadata, type OrderRecord } from "@/lib/checkout";
import { fetchSerpAuthEntitlementsByEmail } from "@/lib/serp-auth/internal-entitlements";
import { getSiteConfig } from "@/lib/site-config";
import { getAllProducts } from "@/lib/products/product";
import { buildPrimaryNavProps } from "@/lib/navigation";
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar";
import logger from "@/lib/logger";
import { getStripeClient } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

type DashboardAccount = Parameters<typeof AccountDashboard>[0]["account"];

type SearchParamsPromise = Promise<Record<string, string | string[]>>;

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: SearchParamsPromise;
}) {
  const cookieStore = await cookies();
  const params: Record<string, string | string[]> =
    (searchParams ? await searchParams : undefined) ?? {};
  const sessionCookie = cookieStore.get("store_account_session")?.value ?? null;
  const account = await getAccountFromSessionCookie(sessionCookie);

  const siteConfig = getSiteConfig();
  const products = getAllProducts();
  const navProps = buildPrimaryNavProps({ products, siteConfig });

  let verifiedRecently = normalizeParam(params?.verified) === "1";
  let prefilledEmail = normalizeParam(params?.email) ?? "";
  const verificationError = cookieStore.get("account_verification_error")?.value ?? null;

  const adminTokenEnv = process.env.ACCOUNT_ADMIN_TOKEN;
  const adminTokenParam =
    normalizeParam(params?.adminToken) ??
    normalizeParam(params?.admin_token) ??
    normalizeParam(params?.admintoken);
  const impersonateEmail =
    normalizeParam(params?.impersonate) ?? normalizeParam(params?.impersonateEmail) ?? normalizeParam(params?.impersonate_email);

  const deploymentEnv = process.env.VERCEL_ENV ?? "development";
  const isLocalStack = process.env.NODE_ENV !== "production" && !process.env.VERCEL_ENV;
  const isPreview = deploymentEnv === "preview";
  const isStaging = deploymentEnv === "staging";
  const isTrustedEnvironment = isLocalStack || isPreview || isStaging;

  if (verificationError) {
    cookieStore.delete("account_verification_error");
  }

  let purchases: PurchaseSummary[] = [];
  let accountSummary: DashboardAccount | null = null;
  let entitlements: string[] = [];
  let entitlementsStatus: "ok" | "unavailable" | "error" = "unavailable";
  let entitlementsMessage: string | null = null;

  if (account) {
    purchases = await buildPurchaseSummaries(account.email);
    accountSummary = {
      email: account.email,
      status: account.status,
      verifiedAt: account.verifiedAt?.toISOString() ?? null,
    } satisfies DashboardAccount;

    const entitlementsResult = await fetchSerpAuthEntitlementsByEmail(account.email);
    if (entitlementsResult.status === "ok") {
      entitlementsStatus = "ok";
      entitlements = entitlementsResult.entitlements;
    } else if (entitlementsResult.status === "skipped") {
      entitlementsStatus = "unavailable";
      entitlements = [];
      entitlementsMessage = "Can’t load permissions right now.";
    } else {
      entitlementsStatus = "error";
      entitlements = [];
      entitlementsMessage = "Can’t load permissions right now.";
    }
  }

  const preview = getDevPreviewData(params);

  if (preview) {
    accountSummary = preview.account;
    purchases = preview.purchases;
    verifiedRecently = preview.verifiedRecently ?? verifiedRecently;
    prefilledEmail = preview.account.email;
    entitlements = ["loom-downloader", "vimeo-downloader", "youtube-downloader", "serp-downloaders-bundle"];
    entitlementsStatus = "ok";
    entitlementsMessage = null;
  }

  let adminOverride = false;

  const adminTokenSatisfied =
    (adminTokenEnv && adminTokenParam && adminTokenParam === adminTokenEnv) || (isTrustedEnvironment && Boolean(adminTokenEnv));

  if (!accountSummary && adminTokenSatisfied && impersonateEmail) {
    const adminPurchases = await buildPurchaseSummaries(impersonateEmail);
    purchases = adminPurchases;
    accountSummary = {
      email: impersonateEmail,
      status: "admin_impersonation",
      verifiedAt: new Date().toISOString(),
    } satisfies DashboardAccount;
    prefilledEmail = impersonateEmail;
    adminOverride = true;
  }

  if (adminOverride) {
    verifiedRecently = true;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PrimaryNavbar {...navProps} />

      <main className="flex-1 py-16 px-4">
        <div className="max-w-2xl mx-auto space-y-10">
          {accountSummary ? (
            <AccountDashboard
              account={accountSummary}
              purchases={purchases}
              entitlements={entitlements}
              entitlementsStatus={entitlementsStatus}
              entitlementsMessage={entitlementsMessage}
              verifiedRecently={verifiedRecently}
            />
          ) : (
            <AccountVerificationFlow
              defaultEmail={prefilledEmail}
              verificationError={verificationError}
              recentlyVerified={verifiedRecently}
            />
          )}
        </div>
      </main>

    </div>
  );
}

function normalizeParam(value?: string | string[] | null): string | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

function getDevPreviewData(
  searchParams?: Record<string, string | string[]> | undefined,
): { account: DashboardAccount; purchases: PurchaseSummary[]; verifiedRecently?: boolean } | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const previewParam = normalizeParam(searchParams?.preview) ?? normalizeParam(searchParams?.mock);

  if (!previewParam) {
    return null;
  }

  const acceptedValues = new Set(["1", "true", "account", "demo", "preview"]);

  if (!acceptedValues.has(previewParam.toLowerCase())) {
    return null;
  }

  const now = Date.now();

  const account: DashboardAccount = {
    email: "jane.designer@example.com",
    status: "active",
    verifiedAt: new Date(now - 2 * 60 * 1000).toISOString(),
  };

  const purchases: PurchaseSummary[] = [
    {
      orderId: "ord_dev_preview_1",
      offerId: "pro-downloader-suite",
      purchasedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      amountFormatted: "$129.00",
      source: "stripe",
      receiptNumber: "1234-5678",
      licenseKey: "SERP-DEV-1234-5678-ABCD",
      licenseStatus: "active",
      licenseUrl: "https://example.com/licenses/pro-downloader-suite",
    },
    {
      orderId: "ord_dev_preview_2",
      offerId: "tiktok-downloader-pro",
      purchasedAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
      amountFormatted: "$49.00",
      source: "stripe",
      licenseKey: "SERP-DEV-TIKTOK-9087",
      licenseStatus: "active",
      licenseUrl: "https://example.com/licenses/tiktok-downloader-pro",
    },
    {
      orderId: "ord_dev_preview_3",
      offerId: "instagram-saver",
      purchasedAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
      amountFormatted: "$29.00",
      source: "legacy_paypal",
      licenseKey: null,
      licenseStatus: "pending",
      licenseUrl: null,
    },
  ];

  return {
    account,
    purchases,
    verifiedRecently: true,
  };
}

async function buildPurchaseSummaries(email: string): Promise<PurchaseSummary[]> {
  const orders = await findRecentOrdersByEmail(email, 20);

  if (!orders.length) {
    return [];
  }

  const purchaseSummaries = orders.map((order) => {
    const amountFormatted = formatAmount(order.amountTotal, order.currency);
    const metadata = normalizeMetadata(order.metadata);

    const receiptNumber = getReceiptNumberFromMetadata(metadata);

    return {
      orderId: order.id,
      offerId: order.offerId,
      purchasedAt: order.createdAt.toISOString(),
      amountFormatted,
      source: order.source,
      receiptNumber,
      paymentStatus: order.paymentStatus,
      checkoutStatus: order.checkoutSessionStatus,
      stripeSessionId: order.stripeSessionId,
      paymentIntentId: order.stripePaymentIntentId,
    } satisfies PurchaseSummary;
  });

  await maybeHydrateReceiptNumber(purchaseSummaries, orders);

  return purchaseSummaries;
}

function normalizeMetadata(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getReceiptNumberFromMetadata(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  if (typeof metadata.receiptNumber === "string" && metadata.receiptNumber.trim()) return metadata.receiptNumber.trim();
  if (typeof metadata.receipt_number === "string" && metadata.receipt_number.trim()) return metadata.receipt_number.trim();
  return null;
}

async function maybeHydrateReceiptNumber(purchases: PurchaseSummary[], orders: OrderRecord[]): Promise<void> {
  const index = purchases.findIndex((purchase, idx) => {
    if (purchase.source !== "stripe") return false;
    if (purchase.receiptNumber) return false;
    const order = orders[idx];
    return Boolean(
      order?.stripeChargeId ||
        order?.stripePaymentIntentId ||
        order?.stripeSessionId ||
        order?.providerChargeId ||
        order?.providerPaymentId ||
        order?.providerSessionId,
    );
  });

  if (index < 0) {
    return;
  }

  const order = orders[index];
  if (!order) return;

  const receiptNumber = await fetchStripeReceiptNumber(order);
  if (!receiptNumber) return;

  purchases[index] = {
    ...purchases[index],
    receiptNumber,
  };

  try {
    await updateOrderMetadata(
      { stripePaymentIntentId: order.stripePaymentIntentId, stripeSessionId: order.stripeSessionId },
      { receiptNumber, receipt_number: receiptNumber },
    );
  } catch {
    // best-effort
  }
}

async function fetchStripeReceiptNumber(order: OrderRecord): Promise<string | null> {
  const stripeChargeId = order.stripeChargeId ?? order.providerChargeId ?? null;
  const stripePaymentIntentId = order.stripePaymentIntentId ?? order.providerPaymentId ?? null;
  const stripeSessionId = order.stripeSessionId ?? order.providerSessionId ?? null;

  if (!stripeChargeId && !stripePaymentIntentId && !stripeSessionId) {
    return null;
  }

  try {
    const stripe = getStripeClient({
      mode: order.providerMode ?? "auto",
      accountAlias: order.providerAccountAlias ?? undefined,
    });

    if (stripeChargeId) {
      const receiptNumber = await fetchReceiptNumberFromCharge(stripe, stripeChargeId);
      if (receiptNumber) return receiptNumber;
    }

    if (stripePaymentIntentId) {
      const receiptNumber = await fetchReceiptNumberFromPaymentIntent(stripe, stripePaymentIntentId);
      if (receiptNumber) return receiptNumber;
    }

    if (stripeSessionId) {
      const receiptNumber = await fetchReceiptNumberFromCheckoutSession(stripe, stripeSessionId);
      if (receiptNumber) return receiptNumber;
    }

    logger.info("account.receipt_number_unavailable", {
      orderId: order.id,
      stripeChargeId,
      stripePaymentIntentId,
      stripeSessionId,
    });
    return null;
  } catch (error) {
    logger.warn("account.receipt_number_fetch_failed", {
      orderId: order.id,
      stripeChargeId,
      stripePaymentIntentId,
      stripeSessionId,
      error: error instanceof Error ? { message: error.message, name: error.name } : String(error),
    });
    return null;
  }
}

async function fetchReceiptNumberFromCharge(
  stripe: ReturnType<typeof getStripeClient>,
  chargeId: string,
): Promise<string | null> {
  const charge = await stripe.charges.retrieve(chargeId);
  return charge.receipt_number ?? null;
}

async function fetchReceiptNumberFromPaymentIntent(
  stripe: ReturnType<typeof getStripeClient>,
  paymentIntentId: string,
): Promise<string | null> {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });
  const receiptFromCharge = getReceiptNumberFromCharge(paymentIntent.latest_charge);
  if (receiptFromCharge) return receiptFromCharge;

  if (typeof paymentIntent.latest_charge === "string") {
    const receiptNumber = await fetchReceiptNumberFromCharge(stripe, paymentIntent.latest_charge);
    if (receiptNumber) return receiptNumber;
  }

  const charges = await stripe.charges.list({ payment_intent: paymentIntentId, limit: 1 });
  return charges.data?.[0]?.receipt_number ?? null;
}

async function fetchReceiptNumberFromCheckoutSession(
  stripe: ReturnType<typeof getStripeClient>,
  sessionId: string,
): Promise<string | null> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent", "payment_intent.latest_charge"],
  });

  if (!session.payment_intent) {
    return null;
  }

  if (typeof session.payment_intent === "string") {
    return await fetchReceiptNumberFromPaymentIntent(stripe, session.payment_intent);
  }

  const receiptFromCharge = getReceiptNumberFromCharge(session.payment_intent.latest_charge);
  if (receiptFromCharge) return receiptFromCharge;

  if (typeof session.payment_intent.latest_charge === "string") {
    const receiptNumber = await fetchReceiptNumberFromCharge(stripe, session.payment_intent.latest_charge);
    if (receiptNumber) return receiptNumber;
  }

  return session.payment_intent.id
    ? await fetchReceiptNumberFromPaymentIntent(stripe, session.payment_intent.id)
    : null;
}

function getReceiptNumberFromCharge(charge: unknown): string | null {
  if (!charge || typeof charge !== "object") {
    return null;
  }

  const receiptNumber = (charge as { receipt_number?: unknown }).receipt_number;
  return typeof receiptNumber === "string" && receiptNumber.trim() ? receiptNumber : null;
}

function formatAmount(amount: number | null, currency: string | null): string | null {
  if (!amount || amount <= 0) {
    return null;
  }

  const currencyCode = (currency ?? "usd").toUpperCase();

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currencyCode}`;
  }
}
