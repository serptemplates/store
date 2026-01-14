# Store Launch Monitoring Playbook

Checklist for configuring monitoring and alerts after a deployment.

## 1) Prerequisites

- Vercel access to the `apps.serp.co` project.
- Ops alert webhook set (`OPS_ALERT_WEBHOOK_URL` or `SLACK_ALERT_WEBHOOK_URL`).
- `DATABASE_URL` configured (monitoring queries depend on checkout_sessions/webhook_logs).

## 2) Configure monitoring env vars

Set these in Vercel (Production + Preview as needed):

| Key | Suggested Value | Notes |
| --- | --- | --- |
| `MONITORING_TOKEN` | random string | Required to call monitoring endpoints.
| `CHECKOUT_MONITOR_STALE_SESSION_MINUTES` | `15` | Pending sessions older than this trigger alerts.
| `CHECKOUT_MONITOR_STALE_WEBHOOK_MINUTES` | `10` | Pending webhook logs older than this trigger alerts.
| `CHECKOUT_MONITOR_WEBHOOK_LOOKBACK_HOURS` | `6` | Lookback window for errored webhook logs.
| `CHECKOUT_MONITOR_MIN_ORDERS_LOOKBACK_HOURS` | `24` | Window for minimum order check.
| `CHECKOUT_MONITOR_MIN_ORDERS` | `1` | Minimum expected orders in that window.

## 3) Add Vercel cron

Create a cron job in Vercel:

- Path: `/api/monitoring/health?alert=1`
- Method: `GET`
- Header: `Authorization: Bearer <MONITORING_TOKEN>`
- Schedule: every 5 minutes (or your preferred cadence)

Manual check:

```bash
curl -H "Authorization: Bearer <MONITORING_TOKEN>" https://apps.serp.co/api/monitoring/health
```

## 4) Entitlements retry endpoint

If serp-auth grants fail, the retry endpoint replays entitlements for recent failures:

```bash
curl -H "Authorization: Bearer <MONITORING_TOKEN>" \
  "https://apps.serp.co/api/monitoring/entitlements/retry?lookbackHours=24&limit=10&alert=1"
```

Use `dryRun=1` to audit without sending:

```bash
curl -H "Authorization: Bearer <MONITORING_TOKEN>" \
  "https://apps.serp.co/api/monitoring/entitlements/retry?dryRun=1&lookbackHours=24&limit=10"
```

## 5) Post-launch checks

- Verify `/sitemap.xml` loads.
- Confirm Stripe dashboard shows new Checkout Sessions.
- Confirm `checkout_sessions` records have `ghlSyncedAt` for successful GHL syncs.
- Check Ops Slack channel for any webhook or serp-auth alerts.
