#!/usr/bin/env npx tsx

import { grantSerpAuthEntitlements } from "@/lib/serp-auth/entitlements";

function readEnv(name: string): string | null {
  const raw = process.env[name];
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseEntitlements(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

async function main() {
  const email = readEnv("SERP_AUTH_TEST_EMAIL") ?? "buyer@example.com";
  const entitlements = parseEntitlements(readEnv("SERP_AUTH_TEST_ENTITLEMENTS"));
  const resolvedEntitlements = entitlements.length > 0 ? entitlements : ["loom-video-downloader"];

  console.log("serp-auth grant smoke test");
  console.log(`SERP_AUTH_BASE_URL=${readEnv("SERP_AUTH_BASE_URL") ?? "https://auth.serp.co"}`);
  console.log(`email=${email}`);
  console.log(`entitlements=${resolvedEntitlements.join(",")}`);

  await grantSerpAuthEntitlements({
    email,
    entitlements: resolvedEntitlements,
    context: {
      provider: "stripe",
      providerEventId: "manual-test",
      providerSessionId: "manual-test",
    },
  });
}

main().catch((error) => {
  console.error("serp-auth grant smoke test failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
