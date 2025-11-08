# Store Launch Monitoring Playbook

Detailed checklist for locking down observability and automated smoke-tests before and after cutting over from GHL.

## 1. prerequisites

1. Stripe test + live keys and webhook secrets already configured in Vercel (see `docs/vercel-envs.md`).
2. Slack webhook (or another ops channel URL) saved as `SLACK_ALERT_WEBHOOK_URL` or `OPS_ALERT_WEBHOOK_URL`.
3. Access to the Vercel project (`apps.serp.co`) with permission to edit Environment Variables, Cron Jobs, and Log Drains.
4. Local Stripe CLI installed (`npm install -g stripe`) for optional checks.

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

## 4. pipe logs to your observability stack (optional)

> ℹ️ Log Drains require a Vercel Pro (or higher) plan. If you are on the Hobby tier, skip to the alternatives below.

1. **If you have Log Drains:**
   - Visit Vercel → **Project → Settings → Observability → Log Drains**.
   - Click **Add Log Drain** and choose your provider (Datadog, Logtail, BetterStack, etc.).
   - Supply the destination URL/token from your provider. Vercel immediately starts forwarding JSON logs.
   - Confirm you see structured events such as `{"event":"checkout.session.completed","level":"info", ...}` inside your logging tool.
2. **Hobby-plan alternatives:**
   - Use `vercel logs apps.serp.co --since 1h --output json` (or `vercel tail`) to stream logs into your terminal or forward them to a local file/processor.
   - Schedule the monitoring cron job (Section 3) to alert you on anomalies; combine it with Stripe dashboard email alerts for payment failures.
   - Consider wiring key failures (e.g., webhook errors) straight to Slack via `sendOpsAlert`—those already trigger without Log Drains if `SLACK_ALERT_WEBHOOK_URL` is set.

## 5. run checkout e2e verification (test mode)

1. Confirm `.env` contains `STRIPE_SECRET_KEY_TEST`, `STRIPE_SECRET_KEY`, and `NEXT_PUBLIC_STRIPE_MODE=test`. The `test:e2e` runner uses the live key only to look up metadata; no live charges occur.
2. Start a Stripe CLI listener so webhooks reach your local app:
   ```sh
   stripe listen --forward-to http://localhost:3000/api/stripe/webhook --api-key $STRIPE_SECRET_KEY_TEST
   ```
   Copy the emitted `whsec_...` value into `STRIPE_WEBHOOK_SECRET_TEST` (the runner can inject it automatically when launching the dev server).
3. Execute the end-to-end suite:
   ```sh
   pnpm --filter @apps/store test:e2e
   ```
   This script bootstraps the dev server (if not already running), drives a Playwright checkout, runs the automated payment/link validation scripts, and exercises the acceptance flow against Stripe test mode.
4. After the run, review:
   - Stripe Dashboard → Payments (test mode) for the synthetic order, ensuring the SERP Downloaders Bundle recommendation and TOS consent are present.
   - `/checkout/success` console logs for the `checkout:completed` PostHog event.
   - GoHighLevel test workspace for the appended metadata (confirm existing custom fields weren’t overwritten).
5. Record the outcome in `plan-194.md` (Phase 5 analytics validation) so we have traceability before deploying.

## 6. targeted manual webhook test (optional)

1. With the Stripe CLI listener active, open a product page locally (`pnpm --filter @apps/store dev`) and click the CTA:
   - Standard product → Stripe Payment Link (`?prefilled_email=` optional).
   - Pre-release slug → waitlist modal (confirm no Payment Link opens).
2. Complete the Stripe checkout using test cards and apply the `TEST20` promo code to confirm discounts work.
3. Watch the dev server logs for `checkout.session.completed` and GHL sync messages; ensure metadata is appended rather than overwritten.
4. Refresh `/checkout/success` once to ensure analytics events do not duplicate (guard against double firing).

## 7. rollout checklist

1. Redeploy after every environment-variable change.
2. Confirm `/sitemap.xml` renders (ensures tree updated for crawlers).
3. Check Vercel cron status page to verify the job is executing.
4. Review Stripe Dashboard → Developers → Events for real traffic once live; you should see orders mirrored in the database (`orders` table) and Slack alerts only when issues arise.

Keep this file updated as you add new observability integrations or adjust thresholds.
