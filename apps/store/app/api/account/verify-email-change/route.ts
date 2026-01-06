import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import logger from "@/lib/logger";
import {
  AccountEmailUpdateError,
  AccountEmailVerificationError,
  getAccountFromSessionCookie,
  verifyAccountEmailChange,
} from "@/lib/account/service";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
});

export async function POST(request: NextRequest) {
  let payload: z.infer<typeof bodySchema>;

  try {
    const json = await request.json();
    payload = bodySchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const sessionCookie = request.cookies.get("store_account_session")?.value ?? null;
  const account = await getAccountFromSessionCookie(sessionCookie);

  if (!account) {
    return NextResponse.json({ error: "You must be signed in to verify your email." }, { status: 401 });
  }

  try {
    const result = await verifyAccountEmailChange(account, payload);
    const message =
      result.status === "unchanged"
        ? "Email is already up to date."
        : "Email updated successfully.";

    return NextResponse.json({
      status: result.status,
      message,
      account: { email: result.account.email },
    });
  } catch (error) {
    if (error instanceof AccountEmailVerificationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    if (error instanceof AccountEmailUpdateError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    logger.error("account.email_change_verify_failed", {
      accountId: account.id,
      error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
    });

    return NextResponse.json({ error: "Unable to verify email." }, { status: 500 });
  }
}
