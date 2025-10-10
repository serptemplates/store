import { NextRequest, NextResponse } from "next/server";
import { sendOpsAlert } from "@/lib/notifications/ops";

function sanitiseString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return value.slice(0, 4000);
}

function sanitiseRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const entries = Object.entries(value).slice(0, 25);
  return Object.fromEntries(entries);
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const { name, message, stack, url, userAgent, properties } = payload as Record<string, unknown>;

  const resolvedMessage = sanitiseString(message) ?? "Unknown error";
  const resolvedName = sanitiseString(name) ?? "Error";

  const context: Record<string, unknown> = {};

  const resolvedStack = sanitiseString(stack);
  if (resolvedStack) {
    context.stack = resolvedStack;
  }

  const resolvedUrl = sanitiseString(url);
  if (resolvedUrl) {
    context.url = resolvedUrl;
  }

  const resolvedUserAgent = sanitiseString(userAgent);
  if (resolvedUserAgent) {
    context.userAgent = resolvedUserAgent;
  }

  const resolvedProperties = sanitiseRecord(properties);
  if (resolvedProperties) {
    context.properties = resolvedProperties;
  }

  await sendOpsAlert(`[frontend] ${resolvedName}: ${resolvedMessage}`, context);

  return NextResponse.json({ ok: true });
}
