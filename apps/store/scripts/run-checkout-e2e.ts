import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

const projectRoot = resolve(__dirname, "..");
const repoRoot = resolve(projectRoot, "..", "..");

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const stripeCmd = process.platform === "win32" ? "stripe.exe" : "stripe";

const steps: Array<{
  title: string;
  command: string[];
  description: string;
}> = [
  {
    title: "Playwright checkout flow",
    description: "Simulate product lander → Stripe checkout → thank-you page",
    command: [
      pnpmCmd,
      "exec",
      "playwright",
      "test",
      "tests/checkout-smoke.spec.ts",
      "--project=Desktop Chrome",
    ],
  },
  {
    title: "Automated payment flow",
    description: "Create Stripe session, confirm webhook + DB writes, trigger GHL sync",
    command: [pnpmCmd, "exec", "tsx", "automated-payment-test.ts"],
  },
  {
    title: "Acceptance suite",
    description: "Verify Stripe, Postgres, email, and GHL automation end-to-end",
    command: [pnpmCmd, "exec", "tsx", "acceptance-test.ts"],
  },
];

const backgroundProcesses: ChildProcess[] = [];

function registerBackgroundProcess(child: ChildProcess, label: string) {
  backgroundProcesses.push(child);
  child.on("exit", (code, signal) => {
    if (code === null && signal === "SIGTERM") {
      return;
    }
    if (code !== 0) {
      console.warn(`⚠ ${label} exited unexpectedly (code: ${code}, signal: ${signal ?? "none"}).`);
    }
  });
}

async function waitForHttp(url: string, timeoutMs: number, intervalMs = 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return true;
      }
    } catch {
      // ignore and retry
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

async function detectDevServer(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:3000/api/health");
    return res.ok;
  } catch {
    return false;
  }
}

async function startStripeListener(forwardUrl: string): Promise<string> {
  console.log("\n🔌 Starting Stripe CLI listener...");
  const listener = spawn(stripeCmd, ["listen", "--forward-to", forwardUrl], {
    cwd: repoRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "inherit"],
  });

  registerBackgroundProcess(listener, "Stripe CLI listener");

  return await new Promise<string>((resolve, reject) => {
    let resolved = false;
    let buffer = "";

    listener.on("error", (error) => {
      if (!resolved) {
        reject(new Error(`Failed to start Stripe CLI listener: ${error.message}`));
      }
    });

    listener.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      process.stdout.write(text);
      buffer += text;
      const match = buffer.match(/whsec_[0-9A-Za-z]+/);
      if (match && !resolved) {
        resolved = true;
        resolve(match[0]);
      }
    });

    listener.on("exit", (code) => {
      if (!resolved) {
        reject(new Error(`Stripe CLI exited early with code ${code}`));
      }
    });
  });
}

async function startDevServer(envOverrides: Record<string, string>) {
  console.log("\n🟢 Starting Next.js dev server...");
  const child = spawn(pnpmCmd, ["--filter", "@apps/store", "dev"], {
    cwd: repoRoot,
    env: { ...process.env, ...envOverrides },
    stdio: "inherit",
  });
  registerBackgroundProcess(child, "Next.js dev server");

  const ready = await waitForHttp("http://localhost:3000/api/health", 120_000);
  if (!ready) {
    throw new Error("Dev server did not become ready within 120s");
  }
  console.log("✅ Dev server is ready at http://localhost:3000");
}

function runStep(title: string, description: string, command: string[]) {
  console.log("\n==============================");
  console.log(title);
  console.log(`→ ${description}`);
  console.log("==============================\n");

  const [executable, ...args] = command;
  const start = Date.now();
  const result = spawnSync(executable, args, {
    stdio: "inherit",
    cwd: projectRoot,
    env: process.env,
  });
  const duration = ((Date.now() - start) / 1000).toFixed(1);

  if (result.error) {
    throw new Error(`${title} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${title} exited with code ${result.status} (duration ${duration}s)`);
  }

  console.log(`\n✔ ${title} completed in ${duration}s.`);
}

async function main() {
  console.log("🚀 Running full checkout E2E verification...\n");

  const devServerAlreadyRunning = await detectDevServer();
  let injectedSecret: string | undefined;

  if (devServerAlreadyRunning) {
    console.log("ℹ Detected dev server on http://localhost:3000. Skipping auto-start.");
    console.log("   Ensure your Stripe CLI listener is running and matches the configured webhook secret.\n");
  } else {
    try {
      const forwardUrl = process.env.STRIPE_WEBHOOK_FORWARD_URL ?? "http://localhost:3000/api/stripe/webhook";
      injectedSecret = await startStripeListener(forwardUrl);
      console.log(`✅ Stripe CLI listener ready (whsec captured).`);

      process.env.STRIPE_WEBHOOK_SECRET_TEST = injectedSecret;
      await startDevServer({ STRIPE_WEBHOOK_SECRET_TEST: injectedSecret });
    } catch (error) {
      throw new Error(
        `Unable to auto-start prerequisites. ${error instanceof Error ? error.message : String(error)}\n` +
          "Start the dev server (pnpm --filter @apps/store dev) and Stripe CLI manually, then re-run.",
      );
    }
  }

  console.log(
    "\nRunning E2E steps:\n" +
      "  1. Playwright checkout flow\n" +
      "  2. Automated payment flow\n" +
      "  3. Acceptance suite\n",
  );

  for (const step of steps) {
    runStep(step.title, step.description, step.command);
  }

  console.log("\n✅ Checkout E2E verification finished successfully.");
  console.log(
    "Review Stripe (test mode), your inbox, Postgres, and GoHighLevel to inspect generated artifacts.\n",
  );
}

function cleanup() {
  for (const child of backgroundProcesses) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

(async () => {
  try {
    await main();
  } catch (error) {
    console.error("\n✖ E2E verification failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    cleanup();
  }
})();
