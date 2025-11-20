import { NextResponse } from "next/server";

import logger from "@/lib/logger";
import { ensureDatabase, query } from "@/lib/database";

export async function GET() {
  const dbReady = await ensureDatabase();

  if (!dbReady) {
    return NextResponse.json(
      { status: "unavailable", reason: "database_not_configured" },
      { status: 503 },
    );
  }

  try {
    await query`SELECT 1 FROM accounts LIMIT 1;`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logger.error("health.account_db.error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { status: "unavailable", reason: "query_failed" },
      { status: 503 },
    );
  }
}

