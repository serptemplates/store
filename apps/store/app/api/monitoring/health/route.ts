import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { evaluateCheckoutHealth, sendCheckoutHealthAlert } from "@/lib/monitoring";

export const runtime = "nodejs";

function extractAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const headerToken = request.headers.get("x-monitoring-token");
  if (headerToken) {
    return headerToken.trim();
  }

  return null;
}

export async function GET(request: NextRequest) {
  const expectedToken = process.env.MONITORING_TOKEN?.trim();
  if (expectedToken) {
    const provided = extractAuthToken(request);
    if (!provided || provided !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { metrics, issues } = await evaluateCheckoutHealth();

  const status = issues.some((issue) => issue.severity === "alert")
    ? "alert"
    : issues.length > 0
      ? "warn"
      : "ok";

  const url = new URL(request.url);
  const shouldAlert = url.searchParams.get("alert") === "1" || url.searchParams.get("alert") === "true";

  if (shouldAlert && status !== "ok") {
    const summaryMessage = `Checkout monitor status: ${status.toUpperCase()}`;
    await sendCheckoutHealthAlert(summaryMessage, {
      status,
      issues,
      metrics,
    });
  }

  return NextResponse.json({ status, issues, metrics });
}
