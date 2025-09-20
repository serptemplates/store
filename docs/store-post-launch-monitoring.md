# Store Launch Monitoring Playbook

Detailed checklist for locking down observability and automated smoke-tests before and after cutting over from GHL.

## 1. prerequisites
<!-- 
1. Stripe test + live keys and webhook secrets already configured in Vercel (see `docs/vercel-envs.md`).
2. Slack webhook (or another ops channel URL) saved as `SLACK_ALERT_WEBHOOK_URL` or `OPS_ALERT_WEBHOOK_URL`.
3. Access to the Vercel project (`apps.serp.co`) with permission to edit Environment Variables, Cron Jobs, and Log Drains.
4. Local Stripe CLI installed (`npm install -g stripe`) for optional checks. -->

## 2. configure monitoring env vars (vercel dashboard)

1. Generate a random monitoring token locally: `openssl rand -hex 16` → e.g. `4e3f0c9a4f6b3a0c6d8844f70516e9d1`.
2. In Vercel, open **Project → Settings → Environment Variables**.
3. Click **Create New**, enter each key/value pair, and select the environments that should use it (Production and Preview recommended). If you skip a key, the app falls back to its default as noted below.

   | Key | Suggested Value | Notes |
   | --- | --- | --- |
   | `MONITORING_TOKEN` | *(random string from step 1)* | Required for auth when calling the health endpoint. |
   | `CHECKOUT_MONITOR_STALE_SESSION_MINUTES` | `15` | Alert if Stripe checkout sessions are stuck in `pending` longer than 15 min. |
   | `CHECKOUT_MONITOR_STALE_WEBHOOK_MINUTES` | `10` | Alert if webhook logs remain pending beyond 10 min. |
   | `CHECKOUT_MONITOR_WEBHOOK_LOOKBACK_HOURS` | `6` | Warn when any webhook log errors in the past 6 h. |
   | `CHECKOUT_MONITOR_MIN_ORDERS_LOOKBACK_HOURS` | `24` | Count orders in the previous 24 h. |
   | `CHECKOUT_MONITOR_MIN_ORDERS` | `1` | Warn if fewer than 1 order in that window (tune to your baseline). |

4. Save each variable. Vercel will prompt you for a redeploy—do that so the monitoring endpoint and scripts see the new values.

## 3. add monitoring health check

1. Note the new API route: `https://apps.serp.co/api/monitoring/health`.
2. Manual check: run `curl -H "Authorization: Bearer <MONITORING_TOKEN>" https://apps.serp.co/api/monitoring/health` to confirm it returns `{ "status": "ok" | "warn" | "alert" }`.
3. Enable alerting by appending `?alert=1`; the endpoint sends a Slack alert whenever status is not `ok`.
4. In Vercel → **Project → Settings → Cron Jobs**, create a new job:
   - Path: `/api/monitoring/health?alert=1`
   - Method: `GET`
   - Schedule: every 5 minutes (or whatever cadence matches your tolerance).
   - Headers: add `Authorization: Bearer <MONITORING_TOKEN>`.
5. Optional: plug the same URL into an external uptime service (UptimeRobot, BetterStack, etc.) with the bearer header so you get dashboards and history.

## 4. pipe logs to your observability stack

1. Visit Vercel → **Project → Settings → Observability → Log Drains**.
2. Click **Add Log Drain** and choose your provider (Datadog, Logtail, BetterStack, etc.).
3. Supply the destination URL/token from your provider. Vercel immediately starts forwarding JSON logs.
4. Confirm you see structured events such as `{"event":"checkout.session.completed","level":"info"...}` inside your logging tool.

## 5. run automated checkout smoke-tests (test mode)

1. Ensure `.env` (local) contains `STRIPE_SECRET_KEY_TEST` and `STRIPE_CHECKOUT_PAYMENT_METHODS` so the script can authenticate.
2. From the repo root, run:
   ```sh
   pnpm test:checkout
   ```
3. The script walks each product YAML in `apps/store/data/products`, creates a **test-mode** Checkout Session via Stripe, and prints either ✅ success or ❌ failure with the error message. No funds are captured.
4. To target a subset of products, pass one or more `--slug` flags:
   ```sh
   pnpm test:checkout -- --slug adobe-stock-downloader --slug canva-downloader
   ```
5. Fix any reported failures (usually missing `stripe.price_id` or bad URLs) before re-running.

## 6. optional manual webhook test

1. Install Stripe CLI and log in (`stripe login`).
2. Start listening locally (use test mode):
   ```sh
   stripe listen --forward-to localhost:4242/webhook
   pnpm dev --filter @apps/store
   ```
3. Trigger a test checkout from the local site or by running `pnpm test:checkout -- --slug <slug>` while the CLI is running; Stripe will replay events to your local webhook handler.
4. Confirm the terminal shows processed events and the app logs don’t contain errors.

## 7. rollout checklist

1. Redeploy after every environment-variable change.
2. Confirm `/sitemap.xml` renders (ensures tree updated for crawlers).
3. Check Vercel cron status page to verify the job is executing.
4. Review Stripe Dashboard → Developers → Events for real traffic once live; you should see orders mirrored in the database (`orders` table) and Slack alerts only when issues arise.

Keep this file updated as you add new observability integrations or adjust thresholds.
