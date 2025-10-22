# Operations Runbooks

Use this index to find the tooling and configuration docs that support the store deployment.

- **Deployment**
  - `store-deployment.md` – Project overview, verification checklist, and manual diagnostics.
  - `DEPLOYMENT-WORKFLOW.md` – Branch protection rules, PR checklist, and Git/GitHub workflow.
- **Environment & Providers**
  - `vercel-envs.md` – Vercel env var matrix and aliasing strategy.
  - `PAYPAL-SETUP.md` – PayPal account + webhook configuration.
  - `MERCHANT-CENTER-SETUP.md` – Google Merchant Center configuration notes.
  - `EMAIL-NOTIFICATIONS.md` – Transactional email setup and incident playbook.
  - `account-license-sync.md` – How /account verification pulls licenses from GHL.
- **Product Launch Modes**
  - `pre-release-cta.md` – Configure waitlist CTAs and understand checkout CTA routing.
- **Monitoring**
  - `store-post-launch-monitoring.md` – Post-launch observation checklist.
  - `MONITORING-SETUP.md` – Runtime metrics, alerts, and dashboards.
  - `REAL-TIME-MONITORING-GUIDE.md` – Manual probes for high-touch incidents.

All scripts referenced in these docs live under `apps/store/scripts/` and load configuration through the shared `scripts/utils/env.ts` helper.
