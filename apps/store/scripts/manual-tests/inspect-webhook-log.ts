#!/usr/bin/env npx tsx

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ensureDatabase, query } from "@/lib/database";

function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readArg(name: string): string | null {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length) || null;
  }
  return null;
}

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = findRepoRoot(scriptDir);

  const envName = (process.env.STORE_ENV ?? readArg("env") ?? "production").toLowerCase();
  const envFile =
    envName === "staging"
      ? ".env.vercel.staging"
      : envName === "preview"
      ? ".env.vercel.preview"
      : ".env.vercel.production";

  loadEnvFile(path.join(repoRoot, envFile));

  const paymentIntentId = process.env.PAYMENT_INTENT_ID ?? readArg("pi");
  if (!paymentIntentId) {
    console.error("Missing PAYMENT_INTENT_ID (or pass --pi=pi_...)");
    process.exitCode = 1;
    return;
  }

  const ready = await ensureDatabase();
  if (!ready) {
    console.error("Database not configured (missing CHECKOUT_DATABASE_URL_*)");
    process.exitCode = 1;
    return;
  }

  const res = await query<{
    payment_intent_id: string;
    status: string;
    attempts: number;
    updated_at: string;
    metadata: unknown;
  }>`
    SELECT payment_intent_id, status, attempts, updated_at, metadata
      FROM webhook_logs
     WHERE payment_intent_id = ${paymentIntentId}
     LIMIT 1;
  `;

  const row = res?.rows?.[0] ?? null;
  console.log(JSON.stringify(row, null, 2));
}

main().catch((error) => {
  console.error("inspect-webhook-log failed", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

