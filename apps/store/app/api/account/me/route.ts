import { NextRequest, NextResponse } from "next/server";

import { getAccountFromSessionCookie } from "@/lib/account/service";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("store_account_session")?.value ?? null;

  if (!sessionCookie) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const account = await getAccountFromSessionCookie(sessionCookie);

  if (!account) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  return NextResponse.json({
    account: {
      email: account.email,
      name: account.name,
      status: account.status,
      verifiedAt: account.verifiedAt?.toISOString() ?? null,
      lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
      createdAt: account.createdAt.toISOString(),
    },
  });
}
