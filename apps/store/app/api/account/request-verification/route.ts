import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requestAccountVerification } from "@/lib/account/service";

const schema = z.object({
  email: z.string().email("A valid email is required"),
  name: z.string().min(1).optional(),
  offerId: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  let payload: z.infer<typeof schema>;

  try {
    const json = await request.json();
    payload = schema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map((issue) => issue.message).join(", ") }, { status: 400 });
    }

    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    const result = await requestAccountVerification(payload.email, {
      offerId: payload.offerId ?? null,
      name: payload.name ?? null,
    });

    return NextResponse.json({
      email: result.account.email,
      status: "verification_sent",
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to request verification",
      },
      { status: 500 },
    );
  }
}
