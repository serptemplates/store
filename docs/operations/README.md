# Operations Runbooks

Use this index to find the tooling and configuration docs that support the store deployment.

## Deployment

- `store-deployment.md` - Project overview, verification checklist, and manual diagnostics.
- `env-files.md` - Local env file layout and key runtime variables.

## Monitoring

- `store-post-launch-monitoring.md` - Post-launch observation checklist.
- `REAL-TIME-MONITORING-GUIDE.md` - Live monitoring endpoints and alerting flow.

## Product launch modes

- `pre-release-cta.md` - Configure waitlist CTAs and checkout routing for pre-release products.

## Legacy references

- `PAYPAL-SETUP.md` - Legacy PayPal account + webhook configuration (historical reference).
- `../archive/operations/repo-cleanup-inventory.md` - Inventory of repo cleanup tasks (archived).

All scripts referenced in these docs live under `apps/store/scripts/` and load configuration through `apps/store/scripts/utils/env.ts`.
