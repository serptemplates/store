"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@repo/ui";
import type { CheckoutSessionStatus } from "@/lib/checkout/types";

type StatusTone = "emerald" | "amber" | "rose" | "slate";

interface AccountDashboardProps {
  account: {
    email: string;
    status: string;
    verifiedAt: string | null;
  };
  purchases: PurchaseSummary[];
  verifiedRecently?: boolean;
}

export interface PurchaseSummary {
  orderId: string;
  offerId: string | null;
  purchasedAt: string | null;
  amountFormatted: string | null;
  source: "stripe" | "ghl" | "legacy_paypal" | "unknown";
  licenseKey?: string | null;
  licenseStatus?: string | null;
  licenseUrl?: string | null;
  paymentStatus?: string | null;
  checkoutStatus?: CheckoutSessionStatus | null;
}

export default function AccountDashboard({ account, purchases, verifiedRecently }: AccountDashboardProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState(account.email);
  const [emailDraft, setEmailDraft] = useState(account.email);
  const [emailUpdating, setEmailUpdating] = useState(false);
  const [emailVerificationPending, setEmailVerificationPending] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

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
      router.replace("/account");
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : String(signOutError));
      setSigningOut(false);
    }
  }, [router]);

  const handleCopyKey = useCallback(async (orderId: string, licenseKey: string) => {
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopiedKey(orderId);
      setTimeout(() => setCopiedKey((current) => (current === orderId ? null : current)), 1800);
    } catch (copyError) {
      console.error("Failed to copy license key", copyError);
    }
  }, []);

  useEffect(() => {
    setAccountEmail(account.email);
    setEmailDraft(account.email);
    setPendingEmail(null);
    setEmailVerificationPending(false);
    setEmailVerificationCode("");
  }, [account.email]);

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
                <Badge variant="secondary" className={statusBadgeClasses[statusVisual.tone]}>
                  {statusVisual.label}
                </Badge>
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Orders & keys</h2>
        </div>

        {purchases.length === 0 ? (
          <Card className="border border-dashed border-slate-200 bg-slate-50">
            <CardContent className="space-y-2 py-8 text-center">
              <p className="text-sm font-semibold text-slate-600">No orders yet</p>
              <p className="text-xs text-slate-500">
                Complete a purchase with this email and it will appear here automatically within a few minutes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100 text-xs">
              {purchases.map((purchase) => (
                <li key={`${purchase.orderId}-${purchase.offerId}`} className="px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium text-slate-900">
                        {purchase.offerId ?? "Unknown product"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        {purchase.amountFormatted ? <span>{purchase.amountFormatted}</span> : null}
                      </div>
                    </div>
                    <Badge variant="outline" className="uppercase tracking-wide text-[10px]">
                      {purchase.source.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    {purchase.licenseKey ? (
                      <>
                        <span className="truncate font-mono" title={purchase.licenseKey}>
                          {purchase.licenseKey}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => handleCopyKey(purchase.orderId, purchase.licenseKey ?? "")}
                        >
                          {copiedKey === purchase.orderId ? "Copied" : "Copy"}
                        </Button>
                      </>
                    ) : (
                      <span>Key pending.</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
