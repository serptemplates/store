"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@repo/ui";

interface VerifyTokenClientProps {
  token: string | null;
}

type Status = "idle" | "verifying" | "success" | "error" | "missing";

export default function VerifyTokenClient({ token }: VerifyTokenClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(token ? "idle" : "missing");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function runVerification() {
      if (!token) {
        return;
      }

      setStatus("verifying");

      try {
        const response = await fetch("/api/account/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Verification failed");
        }

        if (!isMounted) {
          return;
        }

        setStatus("success");
        setTimeout(() => {
          router.replace("/account?verified=1");
          router.refresh();
        }, 500);
      } catch (verificationError) {
        if (!isMounted) {
          return;
        }

        setStatus("error");
        setError(verificationError instanceof Error ? verificationError.message : String(verificationError));
      }
    }

    void runVerification();

    return () => {
      isMounted = false;
    };
  }, [router, token]);

  if (status === "missing") {
    return <MissingToken />;
  }

  if (status === "error") {
    return <VerificationError error={error} />;
  }

  return <VerificationProgress status={status} />;
}

function MissingToken() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Invalid verification link</h1>
        <p className="text-slate-600">
          We couldn&apos;t find your verification token. Request a new code to access your account.
        </p>
        <Button onClick={() => window.location.replace("/account")}>Go back to account</Button>
      </div>
    </div>
  );
}

function VerificationError({ error }: { error: string | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-red-600">Verification failed</h1>
        <p className="text-slate-600">
          {error ?? "The verification link has expired. Request a fresh code and try again."}
        </p>
        <Button variant="outline" onClick={() => window.location.replace("/account")}>Request new code</Button>
      </div>
    </div>
  );
}

function VerificationProgress({ status }: { status: Status }) {
  const heading = status === "success" ? "Verified!" : "Verifying your email";
  const description =
    status === "success"
      ? "Your account is ready. Redirecting to your dashboard..."
      : "Hold tight while we confirm your email and unlock your downloads.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">{heading}</h1>
        <p className="text-slate-600">{description}</p>
      </div>
    </div>
  );
}
