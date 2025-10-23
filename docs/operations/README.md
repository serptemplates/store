# Operations Runbooks

Use this index to find the tooling and configuration docs that support the store deployment.

- **Deployment**
  - `store-deployment.md` – Project overview, verification checklist, and manual diagnostics.
  - `DEPLOYMENT-WORKFLOW.md` – Branch protection rules, PR checklist, and Git/GitHub workflow.
- **Environment & Providers**
  - `vercel-envs.md` – Vercel env var matrix and aliasing strategy.
  - `PAYPAL-SETUP.md` – Legacy PayPal account + webhook configuration (archival reference).
  - `MERCHANT-CENTER-SETUP.md` – Google Merchant Center configuration notes.
  - `EMAIL-NOTIFICATIONS.md` – Transactional email setup and incident playbook.
  - `account-license-sync.md` – How /account verification pulls licenses from GHL.
- **Product Launch Modes**
  - `pre-release-cta.md` – Configure waitlist CTAs and understand checkout CTA routing.
- **Monitoring**
  - `store-post-launch-monitoring.md` – Post-launch observation checklist.
  - `MONITORING-SETUP.md` – Runtime metrics, alerts, and dashboards.
  - `REAL-TIME-MONITORING-GUIDE.md` – Manual probes for high-touch incidents.
- **Support & Sales Enablement**
  - Share the Stripe Payment Link rollout brief (`stripe-payment-links.md`) with account, support, and sales teams. Highlight the new CTA behaviour (opens Stripe in a new tab), the `/checkout/success` redirect contract, and where to pull order metadata in Stripe/GHL when assisting customers.
  - Confirm each team completes their canned-response updates and removes references to the embedded checkout or PayPal flows.

All scripts referenced in these docs live under `apps/store/scripts/` and load configuration through the shared `scripts/utils/env.ts` helper.
