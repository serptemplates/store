import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAccountFromSessionCookie } from "@/lib/account/service";
import { createRateLimiter } from "@/lib/contracts/validation.middleware";

const bodySchema = z.object({
  receiptNumber: z.string().min(3).max(40),
});

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

const receiptRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  keyGenerator: (request) =>
    request.cookies.get("store_account_session")?.value ??
    request.headers.get("x-forwarded-for") ??
    "anonymous",
});

function getAuthBaseUrl(): string {
  const raw = process.env.SERP_AUTH_BASE_URL ?? "https://auth.serp.co";
  return raw.replace(/\/+$/, "");
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get("store_account_session")?.value ?? null;

  if (!sessionCookie) {
    return json({ error: "Not signed in" }, 401);
  }

  const account = await getAccountFromSessionCookie(sessionCookie);

  if (!account) {
    return json({ error: "Session expired" }, 401);
  }

  const rateLimitResult = receiptRateLimiter(request);
  if (!rateLimitResult.success) {
    return json({ error: "Too many requests. Please wait a minute and try again." }, 429);
  }

  let payload: z.infer<typeof bodySchema>;

  try {
    payload = bodySchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: error.issues.map((issue) => issue.message).join(", ") }, 400);
    }
    return json({ error: "Invalid request payload" }, 400);
  }

  const receiptNumber = payload.receiptNumber.trim();
  if (!receiptNumber) {
    return json({ error: "Receipt number is required" }, 400);
  }

  const controller = new AbortController();
  const timeoutMs = 10_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getAuthBaseUrl()}/auth/manual`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: account.email,
        receiptNumber,
      }),
      signal: controller.signal,
    });

    const text = await response.text().catch(() => "");
    let data: Record<string, unknown> = {};
    if (text) {
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        data = {};
      }
    }

    if (!response.ok) {
      const errorMessage =
        typeof (data as { error?: unknown }).error === "string"
          ? (data as { error: string }).error
          : "Receipt lookup failed";
      const status =
        response.status >= 500 && response.status <= 599
          ? 502
          : response.status >= 400 && response.status <= 499
            ? response.status
            : 400;
      return json({ error: errorMessage }, status);
    }

    const entitlements = Array.isArray((data as { entitlements?: unknown }).entitlements)
      ? (data as { entitlements: unknown[] }).entitlements.filter((entry): entry is string => typeof entry === "string")
      : [];

    return json({
      ok: true,
      message: entitlements.length
        ? "Updated your permissions. Refreshing..."
        : "No permissions were found for that receipt number.",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return json({ error: "Receipt lookup timed out. Please try again." }, 504);
    }
    return json(
      { error: error instanceof Error ? error.message : "Receipt lookup failed" },
      500,
    );
  } finally {
    clearTimeout(timeout);
  }
}
