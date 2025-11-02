#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")"/.. && pwd)"
FORWARD_URL="http://localhost:3000/api/stripe/webhook"
SESSION_NAME="checkout-e2e"

echo "🚀 Launching Stripe + Dev in tmux and running local checkout tests"

if ! command -v tmux >/dev/null 2>&1; then
  echo "❌ tmux is not installed. Install tmux or run 'pnpm test:local:checkout' manually."
  exit 1
fi

if ! command -v stripe >/dev/null 2>&1; then
  echo "❌ Stripe CLI is not installed. Install it from https://stripe.com/docs/stripe-cli"
  exit 1
fi

echo "🔑 Fetching Stripe webhook secret (test)…"
WHSEC="$(stripe listen --print-secret)"
if [[ -z "$WHSEC" ]]; then
  echo "❌ Could not obtain Stripe webhook secret via Stripe CLI."
  exit 1
fi

ENV_FILE="$REPO_ROOT/.env"
echo "📝 Writing STRIPE_WEBHOOK_SECRET_TEST to $ENV_FILE"
touch "$ENV_FILE"
# Remove existing line(s) then append
grep -v '^STRIPE_WEBHOOK_SECRET_TEST=' "$ENV_FILE" > "$ENV_FILE.tmp" || true
mv "$ENV_FILE.tmp" "$ENV_FILE"
printf '\nSTRIPE_WEBHOOK_SECRET_TEST=%s\n' "$WHSEC" >> "$ENV_FILE"

# Kill existing session if present
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "🧹 Killing existing tmux session $SESSION_NAME"
  tmux kill-session -t "$SESSION_NAME"
fi

echo "🟢 Starting tmux session: $SESSION_NAME"
tmux new-session -d -s "$SESSION_NAME" -c "$REPO_ROOT" -n "stripe" \
  "stripe listen --forward-to $FORWARD_URL"

tmux split-window -h -t "$SESSION_NAME":0 -c "$REPO_ROOT" \
  "pnpm --filter @apps/store dev"

echo "⏳ Waiting for dev server to become healthy…"
ATTEMPTS=0
until curl -sf "http://localhost:3000/api/health" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS+1))
  if [[ $ATTEMPTS -gt 120 ]]; then
    echo "❌ Dev server did not become ready within 120s"
    tmux kill-session -t "$SESSION_NAME" || true
    exit 1
  fi
  sleep 1
done
echo "✅ Dev server is ready"

echo "▶ Running one-command local checkout tests"
(cd "$REPO_ROOT" && pnpm test:local:checkout || true)

echo "📺 Attach to tmux with: tmux attach -t $SESSION_NAME"
echo "🛑 When finished, kill with: tmux kill-session -t $SESSION_NAME"
