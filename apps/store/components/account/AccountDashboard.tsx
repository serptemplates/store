"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@repo/ui";

type StatusTone = "emerald" | "amber" | "rose" | "slate";

interface AccountDashboardProps {
  account: {
    email: string;
    name: string | null;
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
  source: "stripe" | "paypal" | "ghl" | "unknown";
  licenseKey?: string | null;
  licenseStatus?: string | null;
  licenseUrl?: string | null;
}

export default function AccountDashboard({ account, purchases, verifiedRecently }: AccountDashboardProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Account</p>
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    {account.name ? `${account.name}` : account.email}
                  </CardTitle>
                  <p className="text-xs font-medium text-slate-500">{account.email}</p>
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

          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="grid gap-4 sm:grid-cols-2">
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">License Keys</h2>
          </div>
        </div>

        {purchases.length === 0 ? (
          <Card className="border border-dashed border-slate-200 bg-slate-50">
            <CardContent className="py-12 text-center space-y-2">
              <p className="text-base font-semibold text-slate-600">No orders yet</p>
              <p className="text-sm text-slate-500">
                Complete a purchase with this email and it will appear here automatically within a few minutes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {purchases.map((purchase) => (
              <Card key={`${purchase.orderId}-${purchase.offerId}`} className="border-slate-200 shadow-sm">
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-lg font-semibold text-slate-900">
                        {purchase.offerId ?? "Unknown product"}
                      </CardTitle>
                      <p className="text-sm text-slate-500">
                        {purchase.purchasedAt
                          ? `Purchased ${new Date(purchase.purchasedAt).toLocaleString()}`
                          : "Purchase date pending"}
                      </p>
                      {purchase.amountFormatted && (
                        <p className="text-sm text-slate-600">
                          Amount <span className="font-semibold text-slate-900">{purchase.amountFormatted}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-2 text-sm sm:items-end">
                      <Badge variant="outline" className="uppercase tracking-wide text-xs">
                        {purchase.source.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 border-t border-slate-100 pt-4 md:flex-row md:items-center md:justify-between">
                  {purchase.licenseKey ? (
                    <div className="flex w-full items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-700">
                      <span className="truncate" title={purchase.licenseKey}>
                        {purchase.licenseKey}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 px-3 text-xs"
                        onClick={() => handleCopyKey(purchase.orderId, purchase.licenseKey ?? "")}
                      >
                        {copiedKey === purchase.orderId ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                      License key pending — we&apos;ll drop it here the moment it&apos;s ready.
                    </div>
                  )}

                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
