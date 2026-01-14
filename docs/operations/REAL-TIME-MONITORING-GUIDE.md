# Real-Time Monitoring and Alerting Guide

## Overview

Monitoring in the store is centered around two API endpoints and Slack-based ops alerts. Both endpoints are protected by `MONITORING_TOKEN`.

## Monitoring endpoints

### 1) Checkout health

- Endpoint: `/api/monitoring/health`
- Optional alerting: add `?alert=1` to trigger Slack alerts when status is not `ok`.
- Metrics include pending checkout sessions, pending webhook logs, recent errored webhook logs, and recent order counts.

Example:

```bash
curl -H "Authorization: Bearer <MONITORING_TOKEN>" https://apps.serp.co/api/monitoring/health
```

### 2) Entitlements retry

- Endpoint: `/api/monitoring/entitlements/retry`
- Replays serp-auth entitlements grants for recent failures in `webhook_logs`.
- Parameters: `lookbackHours`, `limit`, `dryRun`, `alert`.

Example:

```bash
curl -H "Authorization: Bearer <MONITORING_TOKEN>" \
  "https://apps.serp.co/api/monitoring/entitlements/retry?lookbackHours=24&limit=10&alert=1"
```

## Alerting

Ops alerts post to Slack when `OPS_ALERT_WEBHOOK_URL` (or `SLACK_ALERT_WEBHOOK_URL`) is set. The health endpoint calls `sendCheckoutHealthAlert` when status is `warn` or `alert`.

## Dashboards to monitor

- Stripe Dashboard (Checkout Sessions, Payments)
- Vercel logs for `apps.serp.co`
- GoHighLevel contact records (purchase metadata and license payload)
- serp-auth service logs (entitlement grants)

## Related docs

- `docs/operations/store-post-launch-monitoring.md`
- `docs/operations/env-files.md`
