import { cookies } from "next/headers";

import AccountDashboard, { type PurchaseSummary } from "@/components/account/AccountDashboard";
import AccountVerificationFlow from "@/components/account/AccountVerificationFlow";
import { getAccountFromSessionCookie } from "@/lib/account/service";
import { findRecentOrdersByEmail } from "@/lib/checkout";
import { fetchLicenseForOrder } from "@/lib/license-service";
import { fetchContactLicensesByEmail } from "@/lib/ghl-client";
import { mergePurchasesWithGhlLicenses } from "@/lib/account/license-integration";
import { getSiteConfig } from "@/lib/site-config";
import { getAllProducts } from "@/lib/products/product";
import { buildPrimaryNavProps } from "@/lib/navigation";
import PrimaryNavbar from "@/components/navigation/PrimaryNavbar";
import { Footer as FooterComposite } from "@repo/ui/composites/Footer";

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

  let adminOverride = false;

  const adminTokenSatisfied =
    (adminTokenEnv && adminTokenParam && adminTokenParam === adminTokenEnv) || (isTrustedEnvironment && Boolean(adminTokenEnv));

  if (!accountSummary && adminTokenSatisfied && impersonateEmail) {
    const adminPurchases = await buildPurchaseSummaries(impersonateEmail);
    purchases = adminPurchases;
    accountSummary = {
      email: impersonateEmail,
      name: "Admin Preview",
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

      <FooterComposite site={{ name: "SERP", url: "https://serp.co" }} />
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
  const licenseEnabled = Boolean(process.env.LICENSE_SERVICE_URL);

  const purchaseSummaries = orders.length
    ? await Promise.all(
        orders.map(async (order) => {
          const amountFormatted = formatAmount(order.amountTotal, order.currency);
          const metadata = order.metadata ?? {};

          const storedLicenseRaw = metadata.license;
          const storedLicense =
            storedLicenseRaw && typeof storedLicenseRaw === "object" && !Array.isArray(storedLicenseRaw)
              ? (storedLicenseRaw as Record<string, unknown>)
              : null;

          const storedLicenseKey =
            typeof storedLicense?.licenseKey === "string" ? storedLicense.licenseKey : null;
          const storedLicenseStatus =
            typeof storedLicense?.status === "string"
              ? storedLicense.status
              : typeof storedLicense?.action === "string"
                ? storedLicense.action
                : null;
          const storedLicenseUrl =
            typeof storedLicense?.url === "string" ? storedLicense.url : null;

          const normalizedStatus = storedLicenseStatus?.toLowerCase() ?? null;
          const licenseRevokedAt = metadata["licenseRevokedAt"];
          const metadataFetchSuppressed = metadata["licenseFetchSuppressed"];
          const licenseFetchSuppressed =
            normalizedStatus === "revoked" ||
            normalizedStatus === "refunded" ||
            normalizedStatus === "cancelled" ||
            normalizedStatus === "canceled" ||
            licenseRevokedAt != null ||
            metadataFetchSuppressed === true ||
            metadataFetchSuppressed === "1";

          let fetchedLicense = null;

          if (licenseEnabled && !storedLicenseKey && !licenseFetchSuppressed) {
            fetchedLicense = await fetchLicenseForOrder({
              email,
              offerId: order.offerId,
              orderId: order.id,
              source: order.source,
            }).catch(() => null);
          }

          const licenseKey = storedLicenseKey ?? fetchedLicense?.licenseKey ?? null;
          const licenseStatus = storedLicenseStatus ?? fetchedLicense?.status ?? null;
          const licenseUrl = storedLicenseUrl ?? fetchedLicense?.url ?? null;

          return {
            orderId: order.id,
            offerId: order.offerId,
            purchasedAt: order.createdAt.toISOString(),
            amountFormatted,
            source: order.source,
            licenseKey,
            licenseStatus,
            licenseUrl,
            paymentStatus: order.paymentStatus,
            checkoutStatus: order.checkoutSessionStatus,
          } satisfies PurchaseSummary;
        }),
      )
    : [];

  const ghlLicenses = await fetchContactLicensesByEmail(email).catch(() => []);

  return mergePurchasesWithGhlLicenses(purchaseSummaries, ghlLicenses);
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
