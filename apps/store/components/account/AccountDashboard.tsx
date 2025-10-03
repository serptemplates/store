"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@repo/ui";

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
  source: "stripe" | "paypal" | "unknown";
  licenseKey?: string | null;
  licenseStatus?: string | null;
  licenseUrl?: string | null;
}

export default function AccountDashboard({ account, purchases, verifiedRecently }: AccountDashboardProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
        <div>
          <p className="text-sm uppercase tracking-wide text-indigo-500 font-semibold">Welcome back</p>
          <h1 className="text-3xl font-semibold text-slate-900 mt-2">
            {account.name ? `${account.name}` : account.email}
          </h1>
          <p className="text-slate-500 mt-2">
            Signed in as <span className="font-medium text-slate-700">{account.email}</span>
          </p>
          {verifiedRecently && (
            <p className="mt-4 text-sm text-emerald-600 font-medium">Email verified — your latest purchases are ready below.</p>
          )}
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
              {account.status === "active" ? "Verified" : "Pending"}
            </Badge>
            {account.verifiedAt && (
              <span className="text-xs text-slate-400">Verified on {new Date(account.verifiedAt).toLocaleString()}</span>
            )}
          </div>
          <Button variant="outline" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? "Signing out..." : "Sign out"}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </header>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Your purchases</h2>
          <p className="text-sm text-slate-500">License keys unlock after we verify your email.</p>
        </div>

        {purchases.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
            <CardContent className="py-12 text-center space-y-2">
              <p className="text-slate-600 font-medium">No orders yet</p>
              <p className="text-sm text-slate-500">
                Complete a purchase with this email and it will appear here automatically within a few minutes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {purchases.map((purchase) => (
              <Card key={`${purchase.orderId}-${purchase.offerId}`} className="border border-slate-100 shadow-sm">
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg text-slate-900">
                      {purchase.offerId ?? "Unknown product"}
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                      {purchase.purchasedAt
                        ? `Purchased on ${new Date(purchase.purchasedAt).toLocaleString()}`
                        : "Purchase date pending"}
                    </p>
                  </div>
                  <Badge variant="outline" className="uppercase tracking-wide">
                    {purchase.source}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {purchase.amountFormatted && (
                    <p className="text-sm text-slate-600">Amount: <span className="font-medium">{purchase.amountFormatted}</span></p>
                  )}
                  {purchase.licenseKey ? (
                    <div className="rounded-lg bg-slate-900 text-slate-100 px-4 py-3 font-mono text-sm overflow-x-auto">
                      {purchase.licenseKey}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      License key pending. We&apos;ll fetch it automatically once it&apos;s issued.
                    </p>
                  )}
                  {purchase.licenseStatus && (
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Status: <span className="text-slate-600 capitalize">{purchase.licenseStatus}</span>
                    </p>
                  )}
                  {purchase.licenseUrl && (
                    <a
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      href={purchase.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Manage license
                    </a>
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
