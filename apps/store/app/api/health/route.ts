import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, service: "store", timestamp: new Date().toISOString() });
}

export const runtime = "nodejs";

