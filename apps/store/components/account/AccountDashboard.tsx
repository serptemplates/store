"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@repo/ui";
import type { CheckoutSessionStatus } from "@/lib/checkout/types";
import { ROUTES } from "@/lib/routes";

type StatusTone = "emerald" | "amber" | "rose" | "slate";

interface AccountDashboardProps {
  account: {
    email: string;
    status: string;
    verifiedAt: string | null;
  };
  purchases: PurchaseSummary[];
  entitlements?: string[];
  entitlementsStatus?: "ok" | "unavailable" | "error";
  entitlementsMessage?: string | null;
  entitlementLinks?: Record<string, string>;
  liveEntitlements?: Record<string, true>;
  verifiedRecently?: boolean;
}

export interface PurchaseSummary {
  orderId: string;
  offerId: string | null;
  purchasedAt: string | null;
  amountFormatted: string | null;
  source: "stripe" | "ghl" | "legacy_paypal" | "unknown";
  receiptNumber?: string | null;
  licenseKey?: string | null;
  licenseStatus?: string | null;
  licenseUrl?: string | null;
  paymentStatus?: string | null;
  checkoutStatus?: CheckoutSessionStatus | null;
  stripeSessionId?: string | null;
  paymentIntentId?: string | null;
  serpAuthGrantStatus?: string | null;
  serpAuthGrantHttpStatus?: number | null;
  serpAuthGrantErrorMessage?: string | null;
  entitlementsResolvedCount?: number | null;
  webhookAttempts?: number | null;
}

function toTitleCase(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const ENTITLEMENT_LABEL_OVERRIDES: Record<string, string> = {
  gohighlevel: "Gohighlevel Downloader",
  "gohighlevel-downloader": "Gohighlevel Downloader",
  clientclub: "Clientclub Downloader",
  "clientclub-downloader": "Clientclub Downloader",
  gokollab: "Gokollab Downloader",
  "gokollab-downloader": "Gokollab Downloader",
};

const HIDDEN_ENTITLEMENTS = new Set(["s-v2"]);

function getPurchaseLabel(purchase: PurchaseSummary): string {
  if (purchase.offerId) {
    return toTitleCase(purchase.offerId);
  }
  return "Purchase";
}

export default function AccountDashboard({
  account,
  purchases,
  entitlements,
  entitlementsStatus,
  entitlementsMessage,
  entitlementLinks,
  liveEntitlements,
  verifiedRecently,
}: AccountDashboardProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState(account.email);
  const [emailDraft, setEmailDraft] = useState(account.email);
  const [emailUpdating, setEmailUpdating] = useState(false);
  const [emailVerificationPending, setEmailVerificationPending] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [repairing, setRepairing] = useState(false);
  const [repairMessage, setRepairMessage] = useState<string | null>(null);
  const [repairError, setRepairError] = useState<string | null>(null);

  const statusToneMap: Record<string, { label: string; tone: StatusTone }> = {
    active: { label: "Verified", tone: "emerald" },
    pending: { label: "Pending verification", tone: "amber" },
    suspended: { label: "Suspended", tone: "rose" },
  };

  const statusVisual =
    statusToneMap[account.status] ?? ({ label: account.status, tone: "slate" } as const);

  const statusBadgeClasses: Record<StatusTone, string> = {
    emerald: "border bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-medium",
    amber: "border bg-amber-100 text-amber-700 border-amber-200 text-xs font-medium",
    rose: "border bg-rose-100 text-rose-700 border-rose-200 text-xs font-medium",
    slate: "border bg-slate-100 text-slate-700 border-slate-200 text-xs font-medium",
  };

  const verifiedDate = account.verifiedAt
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(account.verifiedAt))
    : null;

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    setError(null);

    try {
      await fetch("/api/account/verify", { method: "DELETE" });
      router.replace(ROUTES.account as Route);
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : String(signOutError));
      setSigningOut(false);
    }
  }, [router]);

  useEffect(() => {
    setAccountEmail(account.email);
    setEmailDraft(account.email);
    setPendingEmail(null);
    setEmailVerificationPending(false);
    setEmailVerificationCode("");
    setReceiptNumber((current) => {
      if (current) return current;
      const knownReceipt = purchases.find(
        (purchase) => typeof purchase.receiptNumber === "string" && purchase.receiptNumber.trim(),
      )?.receiptNumber;
      return knownReceipt?.trim() ?? "";
    });
    setRepairMessage(null);
    setRepairError(null);
    setBillingError(null);
    setBillingError(null);
  }, [account.email, purchases]);

  const normalizeEmail = useCallback((value: string) => value.trim().toLowerCase(), []);
  const emailIsValid = emailDraft.trim().length > 3 && emailDraft.includes("@");
  const emailIsUnchanged = normalizeEmail(emailDraft) === normalizeEmail(accountEmail);

  const handleEmailUpdate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setEmailUpdating(true);
      setEmailMessage(null);
      setEmailError(null);

      try {
        const response = await fetch("/api/account/update-email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: emailDraft }),
        });

        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          status?: string;
          pendingEmail?: string;
          expiresAt?: string;
        };

        if (!response.ok) {
          throw new Error(body.error ?? "Unable to update email");
        }

        if (body.status === "unchanged") {
          setEmailMessage(body.message ?? "Email is already up to date.");
          setEmailVerificationPending(false);
          setPendingEmail(null);
          setEmailVerificationCode("");
          return;
        }

        const nextPendingEmail = body.pendingEmail ?? emailDraft;
        setPendingEmail(nextPendingEmail);
        setEmailVerificationPending(true);
        setEmailVerificationCode("");
        setEmailMessage(body.message ?? "Verification code sent to your new email.");
      } catch (updateError) {
        setEmailError(updateError instanceof Error ? updateError.message : String(updateError));
      } finally {
        setEmailUpdating(false);
      }
    },
    [emailDraft],
  );

  const handleEmailVerify = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setEmailVerifying(true);
      setEmailMessage(null);
      setEmailError(null);

      try {
        const response = await fetch("/api/account/verify-email-change", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: pendingEmail ?? emailDraft,
            code: emailVerificationCode,
          }),
        });

        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          status?: string;
          account?: { email?: string };
        };

        if (!response.ok) {
          throw new Error(body.error ?? "Unable to verify email");
        }

        const nextEmail = body.account?.email ?? pendingEmail ?? emailDraft;
        setAccountEmail(nextEmail);
        setEmailDraft(nextEmail);
        setEmailVerificationPending(false);
        setPendingEmail(null);
        setEmailVerificationCode("");
        setEmailMessage(body.message ?? "Email updated successfully.");
        router.refresh();
      } catch (verifyError) {
        setEmailError(verifyError instanceof Error ? verifyError.message : String(verifyError));
      } finally {
        setEmailVerifying(false);
      }
    },
    [emailDraft, emailVerificationCode, pendingEmail, router],
  );

  const formatPurchasedAt = useCallback((value: string | null) => {
    if (!value) return null;
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return value;
    }
  }, []);

  const stripeOrPaypalPurchases = purchases
    .filter((purchase) => purchase.source === "stripe" || purchase.source === "legacy_paypal")
    .filter((purchase) => !purchase.paymentStatus || purchase.paymentStatus === "paid" || purchase.paymentStatus === "succeeded");

  const hasStripePurchase = purchases.some((purchase) => purchase.source === "stripe");
  const ghlPurchases = purchases.filter((purchase) => purchase.source === "ghl");

  const purchaseCards = (stripeOrPaypalPurchases.length > 0 ? stripeOrPaypalPurchases : ghlPurchases).slice(0, 10);
  const primaryPurchase = purchaseCards[0] ?? null;
  const previousPurchases = purchaseCards.length > 1 ? purchaseCards.slice(1) : [];

  const entitlementList = Array.isArray(entitlements) ? entitlements : [];
  const visibleEntitlements = entitlementList
    .map((e) => (typeof e === "string" ? e.trim() : ""))
    .filter(Boolean)
    .filter((e) => !e.endsWith("-bundle"));
  const filteredEntitlements = visibleEntitlements.filter((entitlement) => {
    const normalized = entitlement.toLowerCase();
    if (normalized.startsWith("dub_id_") || normalized.startsWith("dub-")) {
      return false;
    }
    if (HIDDEN_ENTITLEMENTS.has(normalized)) {
      return false;
    }
    if (liveEntitlements && !liveEntitlements[normalized]) {
      return false;
    }
    return true;
  });
  const displayEntitlements = Array.from(
    filteredEntitlements
      .reduce((map, entitlement) => {
        const normalized = entitlement.toLowerCase();
        const label = ENTITLEMENT_LABEL_OVERRIDES[normalized] ?? toTitleCase(entitlement);
        const link = entitlementLinks?.[normalized] ?? null;
        const key = label.toLowerCase();
        const existing = map.get(key);
        if (!existing || (!existing.link && link)) {
          map.set(key, { label, link });
        }
        return map;
      }, new Map<string, { label: string; link: string | null }>())
      .values(),
  );

  displayEntitlements.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

  const runReceiptRecovery = useCallback(
    async (receipt: string) => {
      setRepairing(true);
      setRepairMessage(null);
      setRepairError(null);

      const normalizedReceipt = receipt.trim();
      if (!normalizedReceipt) {
        setRepairError("Receipt number is required.");
        setRepairing(false);
        return;
      }

      try {
        const response = await fetch("/api/account/receipt-recovery", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ receiptNumber: normalizedReceipt }),
        });
        const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
        if (!response.ok) {
          throw new Error(body.error ?? "Unable to repair access");
        }
        setRepairMessage(body.message ?? "Updated your access. Refreshing...");
        router.refresh();
      } catch (recoveryError) {
        setRepairError(recoveryError instanceof Error ? recoveryError.message : String(recoveryError));
      } finally {
        setRepairing(false);
      }
    },
    [router],
  );

  const handleReceiptRecovery = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await runReceiptRecovery(receiptNumber);
    },
    [receiptNumber, runReceiptRecovery],
  );

  const handleBillingPortal = useCallback(async () => {
    setBillingLoading(true);
    setBillingError(null);

    try {
      const params = new URLSearchParams(window.location.search);
      const impersonateEmail =
        params.get("impersonate") ?? params.get("impersonateEmail") ?? params.get("impersonate_email");
      const adminToken = params.get("adminToken") ?? params.get("admin_token") ?? params.get("admintoken");
      const requestBody =
        impersonateEmail || adminToken
          ? JSON.stringify({
              ...(impersonateEmail ? { impersonateEmail } : {}),
              ...(adminToken ? { adminToken } : {}),
            })
          : null;

      const response = await fetch("/api/account/billing-portal", {
        method: "POST",
        headers: requestBody ? { "content-type": "application/json" } : undefined,
        body: requestBody ?? undefined,
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; url?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Unable to open billing portal");
      }

      if (!body.url) {
        throw new Error("Billing portal link unavailable");
      }

      window.location.assign(body.url);
    } catch (billingPortalError) {
      setBillingError(billingPortalError instanceof Error ? billingPortalError.message : String(billingPortalError));
      setBillingLoading(false);
    }
  }, []);

  const handleQuickFix = useCallback(async () => {
    if (!primaryPurchase?.receiptNumber) {
      return;
    }
    await runReceiptRecovery(primaryPurchase.receiptNumber);
  }, [primaryPurchase?.receiptNumber, runReceiptRecovery]);

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Account</p>
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold text-slate-900">{accountEmail}</CardTitle>
                </div>
              </div>
              <div className="flex flex-col gap-3 self-stretch sm:flex-row sm:items-center sm:self-auto">
                {/* <Badge variant="secondary" className={statusBadgeClasses[statusVisual.tone]}>
                  {statusVisual.label}
                </Badge> */}
                <Button
                  className="w-full sm:w-auto"
                  variant="outline"
                  onClick={handleBillingPortal}
                  disabled={!hasStripePurchase || billingLoading}
                >
                  {billingLoading ? "Opening..." : "Manage Account"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full text-sm sm:w-auto"
                >
                  {signingOut ? "Signing out..." : "Sign out"}
                </Button>
              </div>
            </div>
            {billingError ? <p className="text-xs text-rose-600">{billingError}</p> : null}
            {!hasStripePurchase ? (
              <p className="text-xs text-slate-500">No Stripe billing history found for this account yet.</p>
            ) : null}
            {billingError ? <p className="text-xs text-rose-600">{billingError}</p> : null}
            {!hasStripePurchase ? (
              <p className="text-xs text-slate-500">No Stripe billing history found for this account yet.</p>
            ) : null}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardHeader>

          <CardContent className="space-y-4 text-lg text-slate-600">
            <form className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={handleEmailUpdate}>
              <div className="space-y-2">
                <Label htmlFor="account-email-update">Update primary email</Label>
                <Input
                  id="account-email-update"
                  type="email"
                  autoComplete="email"
                  value={emailDraft}
                  onChange={(event) => setEmailDraft(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={!emailIsValid || emailIsUnchanged || emailUpdating}
                className="w-full sm:w-auto"
              >
                {emailUpdating ? "Sending..." : "Send verification code"}
              </Button>
            </form>

            {emailVerificationPending ? (
              <form className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={handleEmailVerify}>
                <div className="space-y-2">
                  <Label htmlFor="account-email-code">
                    Verification code {pendingEmail ? `for ${pendingEmail}` : ""}
                  </Label>
                  <Input
                    id="account-email-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={emailVerificationCode}
                    onChange={(event) => setEmailVerificationCode(event.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="123456"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={emailVerificationCode.length !== 6 || emailVerifying}
                  className="w-full sm:w-auto"
                >
                  {emailVerifying ? "Verifying..." : "Confirm email"}
                </Button>
              </form>
            ) : null}
            {emailMessage && <p className="text-sm text-emerald-600">{emailMessage}</p>}
            {emailError && <p className="text-sm text-red-600">{emailError}</p>}

            
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Your purchases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            {!primaryPurchase ? (
              <p className="text-xs text-slate-500">No paid purchases found for this email yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-slate-900">{getPurchaseLabel(primaryPurchase)}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {primaryPurchase.amountFormatted ? <span>{primaryPurchase.amountFormatted}</span> : null}
                      <Badge variant="outline" className="uppercase tracking-wide text-[10px]">
                        {primaryPurchase.source.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {primaryPurchase.purchasedAt ? <span>{formatPurchasedAt(primaryPurchase.purchasedAt)}</span> : null}
                    {primaryPurchase.paymentStatus ? <span className="uppercase">{primaryPurchase.paymentStatus}</span> : null}
                    {primaryPurchase.receiptNumber ? <span>Receipt: {primaryPurchase.receiptNumber}</span> : null}
                  </div>
                </div>

                {previousPurchases.length > 0 ? (
                  <details className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                    <summary className="cursor-pointer text-xs font-medium text-slate-700">
                      Show previous purchases ({previousPurchases.length})
                    </summary>
                    <ul className="mt-3 space-y-2">
                      {previousPurchases.map((purchase) => (
                        <li key={purchase.orderId} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs font-semibold text-slate-900">{getPurchaseLabel(purchase)}</p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                              {purchase.amountFormatted ? <span>{purchase.amountFormatted}</span> : null}
                              <Badge variant="outline" className="uppercase tracking-wide text-[10px]">
                                {purchase.source.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {purchase.purchasedAt ? <span>{formatPurchasedAt(purchase.purchasedAt)}</span> : null}
                            {purchase.paymentStatus ? <span className="uppercase">{purchase.paymentStatus}</span> : null}
                            {purchase.receiptNumber ? <span>Receipt: {purchase.receiptNumber}</span> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Your Products</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            {entitlementsStatus && entitlementsStatus !== "ok" ? (
              <p className="text-xs text-slate-500">
                {entitlementsMessage ??
                  "Can’t load permissions right now. If access feels wrong, use “Fix my access” below."}
              </p>
            ) : filteredEntitlements.length === 0 ? (
              <p className="text-xs text-slate-500">
                {primaryPurchase
                  ? "Your purchase is recorded, but permissions have not synced yet. Use “Fix my access” below."
                  : "No permissions found for this email yet."}
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">{displayEntitlements.length} permissions</p>
                <ul className="list-disc space-y-1 pl-4 text-xs text-slate-700">
                  {displayEntitlements.map(({ label, link }) => (
                    <li key={label}>
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-slate-900 underline underline-offset-2"
                        >
                          {label}
                        </a>
                      ) : (
                        <span className="font-medium text-slate-900">{label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">Not seeing the right permissions?</p>

          {primaryPurchase?.receiptNumber ? (
            <div className="mt-3">
              <Button className="w-full sm:w-auto" onClick={handleQuickFix} disabled={repairing}>
                {repairing ? "Updating..." : "Fix my access"}
              </Button>
            </div>
          ) : (
            <>
              <p className="mt-1 text-xs text-slate-500">
                Paste your Stripe receipt number to manually force-update your access.
              </p>

              <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={handleReceiptRecovery}>
                <div className="space-y-1">
                  <Label htmlFor="receipt-number">Receipt number</Label>
                  <Input
                    id="receipt-number"
                    value={receiptNumber}
                    onChange={(event) => setReceiptNumber(event.target.value)}
                    placeholder="1234-5678"
                    required
                  />
                </div>
                <div className="pt-6">
                  <Button type="submit" className="w-full sm:w-auto" disabled={repairing}>
                    {repairing ? "Updating..." : "Force update"}
                  </Button>
                </div>
              </form>
            </>
          )}

          {repairMessage ? <p className="mt-2 text-xs text-emerald-700">{repairMessage}</p> : null}
          {repairError ? <p className="mt-2 text-xs text-rose-700">{repairError}</p> : null}
        </div>
      </section>
    </div>
  );
}
