#!/usr/bin/env npx tsx

import { spawn } from "node:child_process";
import path from "node:path";
import { loadScriptEnvironment, resolveScriptPaths } from "../utils/env";

const SCRIPTS: Record<string, string> = {
  acceptance: "acceptance-test.ts",
  "complete-dub-checkout": "complete-dub-test-checkout.ts",
  "dub-attribution": "test-dub-attribution.ts",
  "exact-request": "test-exact-request.ts",
  "fetch-licenses": "fetch-licenses.ts",
  "ghl-api-direct": "test-ghl-api-direct.ts",
  "ghl-direct": "test-ghl-direct.ts",
  "inspect-webhook-log": "inspect-webhook-log.ts",
  "payment-flow": "test-payment-flow.ts",
  "replay-serp-auth": "replay-stripe-event-serp-auth.ts",
  "serp-auth-capture": "serp-auth-capture-server.ts",
  "serp-auth-grant": "test-serp-auth-grant.ts",
  "show-payment-intent": "show-payment-intent.ts",
  "stripe-direct": "test-stripe-direct.ts",
};

const USAGE = `
Usage:
  pnpm --filter @apps/store exec tsx scripts/manual-tests/run.ts <command> [-- <args>]

Commands:
  ${Object.keys(SCRIPTS).sort().join("\n  ")}
`;

function printHelp(): void {
  console.log(USAGE.trim());
}

function resolveScriptPath(scriptKey: string): string | null {
  const scriptFile = SCRIPTS[scriptKey];
  if (!scriptFile) return null;
  const { scriptDir } = resolveScriptPaths(import.meta.url);
  return path.join(scriptDir, scriptFile);
}

async function main(): Promise<void> {
  loadScriptEnvironment(import.meta.url);

  const rawArgs = process.argv.slice(2);
  if (rawArgs.length === 0 || rawArgs[0] === "--help" || rawArgs[0] === "help" || rawArgs[0] === "list") {
    printHelp();
    return;
  }

  const isRunPrefix = rawArgs[0] === "run";
  const scriptKey = isRunPrefix ? rawArgs[1] : rawArgs[0];
  const passthrough = isRunPrefix ? rawArgs.slice(2) : rawArgs.slice(1);

  if (!scriptKey) {
    printHelp();
    process.exit(1);
  }

  const scriptPath = resolveScriptPath(scriptKey);
  if (!scriptPath) {
    console.error(`Unknown command: ${scriptKey}`);
    printHelp();
    process.exit(1);
  }

  const args = ["--filter", "@apps/store", "exec", "tsx", scriptPath, ...passthrough];
  const child = spawn("pnpm", args, {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
