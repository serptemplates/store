#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storeDir = path.resolve(__dirname, "..");

const host = process.env.LHCI_HOST ?? "127.0.0.1";
const port = process.env.LHCI_PORT ?? "4313";
const baseUrl = `http://${host}:${port}`;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? signal}`));
      }
    });
  });
}

async function waitForServer(url, timeoutMs, isServerExited) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (isServerExited()) {
      throw new Error("Next.js server exited before becoming ready.");
    }

    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.ok || response.status >= 300) {
        return;
      }
    } catch {
      // ignore fetch errors while the server is booting
    }

    await delay(1000);
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${url} to respond.`);
}

async function main() {
  console.log("🏗  Building production bundle...");
  await run("pnpm", ["run", "build"], { cwd: storeDir });

  const envForServer = { ...process.env };

  // Set runtime environment to test to bypass HTTPS requirement
  envForServer.RUNTIME_ENV = "test";
  envForServer.NODE_ENV = "production";  // Keep production build but mark as test environment

  envForServer.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE =
    envForServer.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE ?? "pk_live_dummy";
  envForServer.STRIPE_WEBHOOK_SECRET_LIVE =
    envForServer.STRIPE_WEBHOOK_SECRET_LIVE ?? "whsec_live_dummy";
  envForServer.STRIPE_SECRET_KEY_LIVE =
    envForServer.STRIPE_SECRET_KEY_LIVE ?? "sk_live_dummy";

  // Use HTTP for local testing since we're running an HTTP server
  const httpBase = `http://${host}:${port}`;

  if (!envForServer.NEXT_PUBLIC_SITE_URL || !envForServer.NEXT_PUBLIC_SITE_URL.startsWith("http")) {
    envForServer.NEXT_PUBLIC_SITE_URL = httpBase;
  }

  console.log(`🚀 Starting Next.js server on ${baseUrl}...`);
  const server = spawn(
    "pnpm",
    ["exec", "next", "start", "--hostname", host, "--port", port],
    { cwd: storeDir, stdio: "inherit", env: envForServer },
  );

  let serverExited = false;
  let serverExitCode = null;
  server.on("exit", (code, signal) => {
    serverExited = true;
    serverExitCode = code ?? signal;
  });

  try {
    await waitForServer(baseUrl, 60000, () => serverExited);
    console.log("✅ Next.js server ready, running Lighthouse CI...");

    await run(
      "pnpm",
      ["run", "test:lhci"],
      {
        cwd: storeDir,
        env: {
          ...envForServer,
          LHCI_BASE_URL: baseUrl,
        },
      },
    );
  } finally {
    if (!serverExited) {
      server.kill("SIGTERM");
      await delay(500);
    }

    if (serverExited && serverExitCode && serverExitCode !== 0) {
      console.warn(`ℹ️  Next.js server exited with code ${serverExitCode}.`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
