# Store Documentation

This directory collects the docs that support the refactored checkout, payment, and operations stack. The content is grouped by topic so new contributors can find the right context quickly.

- `architecture/` – Application structure, module boundaries, and integration contracts.
- `operations/` – Deployment workflow, environment configuration, monitoring, and provider setup runbooks.
- `security/` – Implementation guidance, validation playbooks, and audit notes.
- `data/` – CSV exports that backfill product/domain metadata.
- `analytics/` – GTM / GA4 configuration blobs.
- `historical/` – Migration and launch notes that are no longer part of the day-to-day workflow but remain useful for archeology.

## Quick Start

1. **Read the architecture docs** (`architecture/checkout-overview.md`, `architecture/payments-stripe-webhook.md`) to understand how the new checkout helpers, Stripe webhook dispatcher, and GHL sync helpers are composed.
2. **Follow the deployment workflow** (`operations/store-deployment.md`, `operations/DEPLOYMENT-WORKFLOW.md`) before promoting changes. The acceptance criteria require `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, and `pnpm test:smoke`.
3. **Review security posture** via `security/SECURITY-README.md` and the accompanying audit reports when hardening or extending payment flows.

If you discover stale content, update or move it into `historical/`; the goal is to keep the active folders aligned with the current codebase.
