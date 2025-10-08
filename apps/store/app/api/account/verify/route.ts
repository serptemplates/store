import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  buildSessionCookie,
  buildSessionClearCookie,
  getAccountFromSessionCookie,
  verifyAccountWithCode,
  verifyAccountWithToken,
} from "@/lib/account/service";

const bodySchema = z.object({
  email: z.string().email().optional(),
  code: z.string().min(4).max(12).optional(),
  token: z.string().min(20).optional(),
});

export async function POST(request: NextRequest) {
  let payload: z.infer<typeof bodySchema>;

  try {
    const json = await request.json();
    payload = bodySchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map((issue) => issue.message).join(", ") }, { status: 400 });
    }

    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  if (!payload.token && (!payload.email || !payload.code)) {
    return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
  }

  try {
    const result = payload.token
      ? await verifyAccountWithToken(payload.token)
      : await verifyAccountWithCode(payload.email!, payload.code!);

    const response = NextResponse.json({
      account: {
        email: result.account.email,
        status: result.account.status,
        verifiedAt: result.account.verifiedAt?.toISOString() ?? null,
      },
    });

    const cookie = buildSessionCookie(result);

    if (cookie) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to verify account",
      },
      { status: 400 },
    );
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const result = await verifyAccountWithToken(token);

    const redirectUrl = new URL("/account?verified=1", request.nextUrl.origin);
    const response = NextResponse.redirect(redirectUrl);

    const cookie = buildSessionCookie(result);

    if (cookie) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }

    return response;
  } catch (error) {
    const redirectUrl = new URL("/account?error=verification", request.nextUrl.origin);
    const response = NextResponse.redirect(redirectUrl, { status: 303 });

    const clearCookie = buildSessionClearCookie();
    response.cookies.set(clearCookie.name, clearCookie.value, clearCookie.options);

    response.cookies.set("account_verification_error", error instanceof Error ? error.message : "Verification failed", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV !== "development",
      maxAge: 60,
      path: "/account",
    });

    return response;
  }
}

export async function DELETE(request: NextRequest) {
  const cookieStore = request.cookies;
  const current = cookieStore.get("store_account_session")?.value;

  if (!current) {
    return NextResponse.json({ status: "no_session" });
  }

  const account = await getAccountFromSessionCookie(current);

  const response = NextResponse.json({
    status: account ? "signed_out" : "no_session",
  });

  const clearCookie = buildSessionClearCookie();
  response.cookies.set(clearCookie.name, clearCookie.value, clearCookie.options);

  return response;
}
