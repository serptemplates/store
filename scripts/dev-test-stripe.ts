import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import fs from "node:fs";
import path from "node:path";

interface RunOptions {
  inheritStdout?: boolean;
}

function runCommand(command: string, args: string[], options: RunOptions = {}) {
  const result = spawnSync(command, args, {
    stdio: options.inheritStdout ? "inherit" : "pipe",
  });

  if (result.status !== 0) {
    const output = result.stderr?.toString()?.trim();
    throw new Error(output || `${command} ${args.join(" ")} failed with code ${result.status}`);
  }
}

function tryRunCommand(command: string, args: string[]) {
  spawnSync(command, args, { stdio: "ignore" });
}

function escapeDoubleQuotes(value: string) {
  return value.replace(/"/g, '\\"');
}

const tmuxVersionCheck = spawnSync("tmux", ["-V"], { stdio: "ignore" });
if (tmuxVersionCheck.status !== 0) {
  console.error("tmux is required for dev:test:stripe. Install tmux and try again.");
  process.exit(1);
}

const stripeVersionCheck = spawnSync("stripe", ["--version"], { stdio: "ignore" });
if (stripeVersionCheck.status !== 0) {
  console.error("Stripe CLI is required for dev:test:stripe. Install it from https://stripe.com/docs/stripe-cli and try again.");
  process.exit(1);
}

const cwd = process.cwd();
const shell = process.env.SHELL ?? "/bin/bash";
const sessionName = process.env.DEV_TEST_STRIPE_TMUX_SESSION ?? "dev-test-stripe";
const forwardTarget = process.env.STRIPE_WEBHOOK_FORWARD_URL ?? "localhost:4242/webhook";
const secretFilePath = path.join(tmpdir(), `stripe-webhook-secret-${Date.now()}.log`);

try {
  if (fs.existsSync(secretFilePath)) {
    fs.unlinkSync(secretFilePath);
  }
} catch (error) {
  console.warn(`Unable to remove existing secret file at ${secretFilePath}:`, error);
}

const escapedRepoPath = escapeDoubleQuotes(cwd);
const escapedSecretPath = escapeDoubleQuotes(secretFilePath);

const stripePaneScript = `
cd "${escapedRepoPath}"
SECRET_FILE="${escapedSecretPath}"
rm -f "$SECRET_FILE"
echo "[stripe] Checking Stripe CLI authentication..."
if stripe whoami >/dev/null 2>&1; then
  echo "[stripe] Already authenticated."
else
  echo "[stripe] Not authenticated. Launching \"stripe login\"..."
  stripe login || { echo "[stripe] Login failed. Press Ctrl+C to retry."; exit 1; }
fi
echo "[stripe] Starting stripe listen → ${forwardTarget}"
stripe listen --forward-to ${forwardTarget} --print-secret | tee "$SECRET_FILE"
`;

const waitForSecretScript = (label: string) => `
cd "${escapedRepoPath}"
SECRET_FILE="${escapedSecretPath}"
echo "[${label}] Waiting for Stripe webhook secret..."
while true; do
  if [ -f "$SECRET_FILE" ]; then
    SECRET_VALUE=$(grep -o 'whsec_[A-Za-z0-9]*' "$SECRET_FILE" | tail -n1)
    if [ -n "$SECRET_VALUE" ]; then
      export STRIPE_WEBHOOK_SECRET_TEST="$SECRET_VALUE"
      echo "[${label}] Using Stripe webhook secret $SECRET_VALUE"
      break
    fi
  fi
  sleep 1
done
`;

const webhookPaneScript = `
${waitForSecretScript("webhook")}
pnpm dev:stripe-webhook
`;

const appPaneScript = `
cd "${escapedRepoPath}"
pnpm --filter @apps/store dev
`;

const shellPaneScript = `
cd "${escapedRepoPath}"
echo "Stripe dev environment running in session ${sessionName}."
echo "Windows:"
echo "  0:stripe   → login/listen (writes webhook secret)"
echo "  1:webhook  → pnpm dev:stripe-webhook"
echo "  2:app      → pnpm --filter @apps/store dev"
echo "  3:shell    → spare shell"
echo " "
echo "Use Ctrl+B, then the window number to switch panes."
echo ""
${shell}
`;

tryRunCommand("tmux", ["kill-session", "-t", sessionName]);

runCommand("tmux", [
  "new-session",
  "-d",
  "-s",
  sessionName,
  "-n",
  "stripe",
  shell,
  "-lc",
  stripePaneScript,
]);

runCommand("tmux", [
  "new-window",
  "-t",
  `${sessionName}:1`,
  "-n",
  "webhook",
  shell,
  "-lc",
  webhookPaneScript,
]);

runCommand("tmux", [
  "new-window",
  "-t",
  `${sessionName}:2`,
  "-n",
  "app",
  shell,
  "-lc",
  appPaneScript,
]);

runCommand("tmux", [
  "new-window",
  "-t",
  `${sessionName}:3`,
  "-n",
  "shell",
  shell,
  "-lc",
  shellPaneScript,
]);

console.log("\nStripe dev environment ready in tmux session:");
console.log(`  Session: ${sessionName}`);
console.log("  Windows:");
console.log("    0:stripe   → stripe login + stripe listen (writes webhook secret)");
console.log("    1:webhook  → pnpm dev:stripe-webhook (waits for webhook secret)");
console.log("    2:app      → pnpm --filter @apps/store dev");
console.log("    3:shell    → spare shell in repo root\n");
console.log("Attach to the session with: tmux attach -t", sessionName);
console.log("(This command will attach automatically now. Detach anytime with Ctrl+B, then D.)\n");

runCommand("tmux", ["select-window", "-t", `${sessionName}:0`]);
runCommand("tmux", ["attach-session", "-t", sessionName], { inheritStdout: true });
