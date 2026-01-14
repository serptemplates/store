"use client";

import { useCallback, useEffect, useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import { Button, Input, Label } from "@repo/ui";
import { ROUTES } from "@/lib/routes";

interface AccountVerificationFlowProps {
  defaultEmail?: string;
  verificationError?: string | null;
  recentlyVerified?: boolean;
}

type Step = "email" | "code";

export default function AccountVerificationFlow({
  defaultEmail = "",
  verificationError,
  recentlyVerified,
}: AccountVerificationFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(defaultEmail ? "code" : "email");
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(verificationError ?? null);
  const [message, setMessage] = useState<string | null>(recentlyVerified ? "Email verified! Loading your account..." : null);

  useEffect(() => {
    if (verificationError) {
      setError(verificationError);
    }
  }, [verificationError]);

  const isEmailValid = useMemo(() => email.length > 3 && email.includes("@"), [email]);

  const handleRequest = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        const response = await fetch("/api/account/request-verification", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Unable to send verification code");
        }

        setStep("code");
        setMessage("Verification code sent! Check your inbox (and spam folder). The code expires in 30 minutes.");
        setError(null);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : String(requestError));
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  const handleVerify = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        const response = await fetch("/api/account/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, code }),
        });

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Verification failed");
        }

        setMessage("Verification successful! Redirecting to your account...");
        setError(null);
        setTimeout(() => {
          router.replace(`${ROUTES.account}?verified=1` as Route);
          router.refresh();
        }, 600);
      } catch (verifyError) {
        setError(verifyError instanceof Error ? verifyError.message : String(verifyError));
      } finally {
        setLoading(false);
      }
    },
    [code, email, router],
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 max-w-lg mx-auto p-8">
      <div className="space-y-2 text-center mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Verify your email</h1>
        <p className="text-slate-600">
          We&apos;ll send a one-time code to unlock your orders, license keys, and downloads.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm mb-6">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {step === "email" ? (
        <form className="space-y-6" onSubmit={handleRequest}>
          <div className="space-y-2">
            <Label htmlFor="account-email" className="text-left">
              Email address used at checkout
            </Label>
            <Input
              id="account-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <Button type="submit" disabled={!isEmailValid || loading} className="w-full">
            {loading ? "Sending code..." : "Send verification code"}
          </Button>
        </form>
      ) : (
        <form className="space-y-6" onSubmit={handleVerify}>
          <div className="space-y-2">
            <Label htmlFor="account-code" className="text-left">
              6-digit verification code
            </Label>
            <Input
              id="account-code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ""))}
              placeholder="123456"
              required
            />
          </div>

          <div className="text-sm text-slate-500">
            Didn&apos;t get the code? Check your spam folder or {" "}
            <button
              type="button"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
              onClick={() => {
                setStep("email");
                setMessage(null);
                setError(null);
              }}
            >
              send it again
            </button>
            .
          </div>

          <Button type="submit" disabled={code.length !== 6 || loading} className="w-full">
            {loading ? "Verifying..." : "Verify and open account"}
          </Button>
        </form>
      )}
    </div>
  );
}
