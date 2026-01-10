import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAccountFromSessionCookie } from "@/lib/account/service";

const bodySchema = z.object({
  receiptNumber: z.string().min(3).max(40),
});

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
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

  try {
    const response = await fetch("https://auth.serp.co/auth/manual", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: account.email,
        receiptNumber,
      }),
    });

    const text = await response.text().catch(() => "");
    const data = text ? (JSON.parse(text) as { entitlements?: string[] }) : {};

    if (!response.ok) {
      const errorMessage =
        typeof (data as { error?: string }).error === "string"
          ? (data as { error: string }).error
          : "Receipt lookup failed";
      return json({ error: errorMessage }, 400);
    }

    const entitlements = Array.isArray(data?.entitlements) ? data.entitlements : [];

    return json({
      ok: true,
      message: entitlements.length
        ? "Updated your permissions. Refreshing..."
        : "No permissions were found for that receipt number.",
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Receipt lookup failed" },
      500,
    );
  }
}

