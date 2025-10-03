import { cookies } from "next/headers";

import AccountDashboard, { type PurchaseSummary } from "@/components/account/AccountDashboard";
import AccountVerificationFlow from "@/components/account/AccountVerificationFlow";
import { getAccountFromSessionCookie } from "@/lib/account-service";
import { findRecentOrdersByEmail } from "@/lib/checkout-store";
import { fetchLicenseForOrder } from "@/lib/license-service";

export const dynamic = "force-dynamic";

type DashboardAccount = Parameters<typeof AccountDashboard>[0]["account"];

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const cookieStore = await cookies();
  const params = (await Promise.resolve(searchParams)) ?? {};
  const sessionCookie = cookieStore.get("store_account_session")?.value ?? null;
  const account = await getAccountFromSessionCookie(sessionCookie);

  let verifiedRecently = normalizeParam(params?.verified) === "1";
  let prefilledEmail = normalizeParam(params?.email) ?? "";
  const verificationError = cookieStore.get("account_verification_error")?.value ?? null;

  if (verificationError) {
    cookieStore.delete("account_verification_error");
  }

  let purchases: PurchaseSummary[] = [];
  let accountSummary: DashboardAccount | null = null;

  if (account) {
    purchases = await buildPurchaseSummaries(account.email);
    accountSummary = {
      email: account.email,
      name: account.name,
      status: account.status,
      verifiedAt: account.verifiedAt?.toISOString() ?? null,
    } satisfies DashboardAccount;
  }

  const preview = getDevPreviewData(params);

  if (preview) {
    accountSummary = preview.account;
    purchases = preview.purchases;
    verifiedRecently = preview.verifiedRecently ?? verifiedRecently;
    prefilledEmail = preview.account.email;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="max-w-5xl mx-auto space-y-10">
        {accountSummary ? (
          <AccountDashboard
            account={accountSummary}
            purchases={purchases}
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
    name: "Jane Designer",
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
      source: "paypal",
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

  const licenseEnabled = Boolean(process.env.LICENSE_SERVICE_URL);

  return Promise.all(
    orders.map(async (order) => {
      const amountFormatted = formatAmount(order.amountTotal, order.currency);

      const license = licenseEnabled
        ? await fetchLicenseForOrder({
            email,
            offerId: order.offerId,
            orderId: order.id,
            source: order.source,
          }).catch(() => null)
        : null;

      return {
        orderId: order.id,
        offerId: order.offerId,
        purchasedAt: order.createdAt.toISOString(),
        amountFormatted,
        source: order.source,
        licenseKey: license?.licenseKey ?? null,
        licenseStatus: license?.status ?? null,
        licenseUrl: license?.url ?? null,
      } satisfies PurchaseSummary;
    }),
  );
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
