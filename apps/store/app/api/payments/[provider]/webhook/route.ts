import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SUPPORTED_PLACEHOLDERS = new Set(["whop", "easy-pay-direct", "lemonsqueezy"]);

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

export async function POST(_req: NextRequest, context: RouteContext) {
  const params = await context.params;
  const provider = typeof params?.provider === "string" ? params.provider.toLowerCase() : "";

  if (!SUPPORTED_PLACEHOLDERS.has(provider)) {
    return json(
      {
        error: "unsupported_payment_provider",
        provider,
      },
      404,
    );
  }

  return json(
    {
      status: "not_implemented",
      provider,
      message: "Webhook placeholder. Once this provider has an adapter, it will feed orders into processFulfilledOrder.",
    },
    501,
  );
}

export const runtime = "nodejs";
