#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME=${1:-checkout-stack}
ROOT_DIR="/Users/devin/repos/projects/emd-monorepo"

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required to run this script. Please install tmux and retry." >&2
  exit 1
fi

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "tmux session '$SESSION_NAME' already exists. Attach with: tmux attach -t $SESSION_NAME" >&2
  exit 1
fi

cd "$ROOT_DIR"

tmux new-session -d -s "$SESSION_NAME" "cd $ROOT_DIR && pnpm --filter @apps/store dev"
tmux split-window -h -t "$SESSION_NAME":0 "cd $ROOT_DIR && pnpm dev:stripe-webhook"
tmux split-window -v -t "$SESSION_NAME":0.1 "cd $ROOT_DIR && stripe listen --forward-to localhost:3000/api/stripe/webhook"
tmux select-layout -t "$SESSION_NAME":0 tiled
tmux attach -t "$SESSION_NAME"
