# plan pmt-checkout-logic

## Objectives
- Replace GHL checkout dependency on lander templates with Stripe-driven checkout while preserving data in GoHighLevel.
- Maintain support for both Stripe and PayPal payments without blocking current revenue flow.
- Capture purchase metadata once at checkout and propagate it to fulfillment, CRM (GHL), and analytics.

## Key Decisions & Answers
- Payment methods: Stripe does not natively process PayPal; options are (a) keep existing PayPal flow in parallel, or (b) adopt Stripe's beta PayPal capability via Payment Element (confirm availability/support). Plan assumes parallel PayPal integration unless beta access confirmed.
- Checkout experience: leverage Stripe Checkout (hosted) for speed/compliance or Stripe Payment Element for fully embedded UI (decide during discovery based on UX and templating needs).
- Product catalog: generate Stripe Products/Prices on demand from lander data via API (store product config in repo/DB) instead of pre-creating in GHL.
- CRM integration: push successful payments into GHL via API (contacts, opportunities, tags) triggered by Stripe webhook events.
- Upsells: out of initial scope. Build core checkout flow for single purchase per session, but design offer config schema so upsells can be added later without refactoring.
- Refund policy: no proactive refund support required. Rely on Stripe/PayPal chargeback notifications; log them for finance and optionally mirror critical events into GHL for awareness.
- Analytics: GA4 (or equivalent) should continue to track page traffic, add-to-cart intent, and completed checkout events; no additional attribution requirements beyond existing instrumentation.

## Required Access & Inputs
- [x] Stripe dashboard access (owner login or delegated access) for configuring products, webhooks, and keys.
- [ ] Stripe API credentials:
  - [x] Production publishable key (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
  - [x] Production secret key (`STRIPE_SECRET_KEY`)
  - [x] Test publishable key (`STRIPE_PUBLISHABLE_KEY_TEST`)
  - [x] Test secret key (`STRIPE_SECRET_KEY_TEST`)
  - [ ] Restricted keys for backend services (if needed)
- [x] Stripe webhook signing secrets for each environment (test/staging/prod) and the target webhook endpoint URLs.
- [x] Stripe test data references: list of offers to be created, desired currency, trial settings, and card test numbers to validate edge cases.
  - Offers: use the active lander price IDs in Stripe test mode (e.g., price_1S2fcZ06JrOmKRCmTwbmGNxm for Vimeo, price_1S954506JrOmKRCm1yhT0LbW for Skool, price_1S954T06JrOmKRCmEJkTKAce for Loom).
  - Cards: standard Stripe test cards (e.g., 4242 4242 4242 4242, 4000 0000 0000 0341 for declines, etc.).
  - Coverage doc: internal Stripe Test Coverage sheet (link TBD).

- [ ] GoHighLevel API key (or service account) plus account/agency IDs, base URL, and mapping to required pipelines, tags, workflows, and custom fields.
  - [x] Location PAT (`GHL_PAT_LOCATION`)
  - [x] Location ID (`GHL_LOCATION_ID`)
  - [x] API base URL (`GHL_API_BASE_URL`)
  - [x] Pipeline/tag/workflow mappings
- [ ] GoHighLevel sandbox or low-risk workspace for integration testing, or plan for isolating test contacts in production.
- [ ] Existing PayPal checkout details: account credentials, current button/link URLs, webhook/IPN configuration, and notification emails to ensure parallel flow keeps working.
- [x] Offer catalog source of truth: spreadsheet or doc with each lander offer name, price, billing cadence, fulfillment notes, and CRM tagging requirements.
- [x] Populate `stripe.price_id`, `stripe.success_url`, and `stripe.cancel_url` in product content for each offer (reuse existing Stripe products).
- [ ] Repository access and deployment credentials for the backend/runtime that will host the checkout session API and webhook handler, including environment variable management process.
- [ ] Database or storage connection details (if using a DB for checkout sessions/orders) with read/write credentials for staging and production.
- [x] Domain/URL inventory for landers, including success/cancel redirect URLs and any custom subdomains managed through DNS.
- [ ] Analytics configuration: GA4 property/measurement IDs, naming convention for `add_to_cart` and purchase events, and Segment (if applicable) write keys/destinations.
  - [x] PostHog key & host (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`)
  - [ ] GA4 measurement ID
  - [ ] Segment write key/destinations (if applicable)
- [ ] Notification channels for ops (Slack webhook, email lists, PagerDuty, etc.) and expectations for alert thresholds.
- [ ] Contact list for stakeholder sign-off (product, finance, support) and escalation paths during rollout.

## Offer Configuration Model
- [x] Define a single source of truth for each lander offer that includes: product identifier, price/plan details, currency, description, fulfillment notes, and checkout metadata within the product content.
- [x] Store configuration in version-controlled product YAML by adding an optional `stripe` block (schema & code updated).
- [x] Reference the same configuration from both the lander template (for display) and the checkout session creator (for validation and metadata attachment).

## Phase 1 – Discovery & Requirements
- [ ] Audit current lander templates to catalog offers, pricing variants, and required customer fields (upsells excluded for now).
- [ ] Confirm business rules for PayPal orders and whether a unified order abstraction can cover both Stripe and PayPal.
- [ ] Inventory existing GHL automation (pipelines, tags, campaigns) to map required payload fields and authentication.
- [ ] Verify available infrastructure: server/runtime to host checkout session creator, webhook listener, secure secrets storage.
- [ ] Document compliance requirements (PCI scope, data retention).

## Phase 2 – Stripe Checkout Implementation
- [ ] Configure Stripe account: enable desired payment methods, set webhook signing secret, create restricted API keys for server-side use.
- [ ] Build checkout session creation service:
  - [x] Accept product identifier, price, customer info, and metadata from lander form submission.
  - [x] Validate inputs server-side; enforce price integrity (no tampering).
  - [x] Attach metadata needed downstream (lander id, offer version, CRM ids).
- [ ] Update lander templates:
  - [x] Replace existing GHL payment links with call to new backend endpoint for lander template (legacy links remain as PayPal fallback).
  - [x] Handle redirect to Stripe Checkout or render Payment Element as chosen.
  - [x] Provide clear success/cancel URLs routed back to landers.
  - [x] Require explicit acceptance of terms/refund policy before checkout and persist acknowledgement.
  - [x] Offer PayPal fallback link alongside Stripe checkout CTA.
- [x] Store temporary order intents to reconcile abandoned carts and webhook results (e.g., DB table `checkout_sessions`).

## Phase 3 – Post-Payment Fulfillment & GHL Sync
- [x] Implement webhook handler for key Stripe events (`checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`). Verify signature to prevent spoofing.
- [ ] On success:
  - [x] Persist final order record (customer, offer, transaction ids, payment method).
  - [x] Call GHL API to upsert contact, attach purchase details, trigger automations (tags, pipelines, workflows).
  - [ ] Dispatch internal notifications/logs (Slack/email) for ops visibility.
- [ ] On failure or timeout:
  - [ ] Surface meaningful messaging to customer via lander callbacks.
  - [ ] Record failure and optionally notify support.
  - [x] Add idempotency safeguards for webhook replays (e.g., lock by payment intent id).

### Immediate Next Steps
- [ ] Persist sync attempts/results in durable storage (e.g., `webhook_logs` table) for retries/auditing.
- [ ] Add customer-facing failure messaging and ops notifications (Slack/email) when checkout or GHL sync fails.
- [ ] Map additional Stripe data (payment intent id, receipt URL, etc.) into GHL custom fields and update YAML accordingly.
- [ ] Instrument structured logging/monitoring and alert thresholds for webhook + GHL errors.

## Phase 4 – PayPal Strategy
- [x] Offer PayPal inside Stripe Checkout so buyers pick card or PayPal on the hosted page; legacy GHL PayPal button removed.
- [ ] Document reconciliation process for PayPal payouts vs Stripe for finance.

## Phase 5 – Testing, Safety Nets & Launch
- [ ] Implement automated tests: unit tests for checkout session builder, webhook handler, CRM client; integration tests against Stripe test mode.
- [ ] Prepare staging environment with Stripe test keys and GHL sandbox (or test account) for end-to-end validation.
- [ ] Add feature flag/kill switch so landers can revert to legacy payment links if issues arise.
- [ ] Instrument logging/monitoring (structured logs, error tracking) and set up alerting on webhook failures or CRM sync errors.
- [ ] Pilot rollout: enable on low-traffic lander, monitor metrics, then expand.

## Safeguards & Operational Considerations
- [ ] Store Stripe keys and GHL tokens in secure vault or env vars, never in client code.
- [ ] Apply rate limiting/throttling on backend endpoints to avoid abuse.
- [ ] Ensure HTTPS everywhere and CORS rules only allow expected origins.
- [ ] Maintain retry policies for outbound GHL calls with exponential backoff.
- [ ] Document rollback path (switch flag, republish legacy landers).
- [ ] Update reporting dashboards to include new order source and monitor chargebacks.

## Open Questions
- None at this time.

## Local Tooling
- [x] Configure STRIPE_WEBHOOK_SECRET_TEST by running `stripe listen --forward-to localhost:4242/webhook` and copying the signing secret into `.env`.
- [x] Start the local webhook server with `pnpm dev:stripe-webhook` (uses `scripts/stripe-webhook-test-server.js`).
- [x] Trigger test events via `stripe trigger checkout.session.completed` to validate end-to-end flow.

## Implementation Blueprint

### Checkout Session Service
- [x] Endpoint: `POST /api/checkout/session` (auth optional). Accept JSON `{ offerId, quantity?, customer: { email, name, phone? }, metadata }`.
- [x] Validation: look up offer config, enforce price/currency, confirm quantity limits, sanitize metadata. Reject if offer disabled.
- [x] Stripe call: use `stripe.checkout.sessions.create` with Price ID, success/cancel URLs from offer config, `mode` (`payment`), allow automatic tax if needed, and attach metadata `{ offerId, landerId, campaignId }`.
- [x] Response: return `{ url, sessionId }` (for redirect) or client secret if using Payment Element. Log intent in `checkout_sessions` store with status `pending` (persistence pending).
- [x] Error handling: map Stripe errors to 400/500 responses, include `stripe_request_id` for debugging (request id capture TODO).

### Order Intent & Persistence
- [x] Table `checkout_sessions` fields: `id` (UUID), `stripeSessionId`, `stripePaymentIntentId`, `offerId`, `landerId`, `customerEmail`, `metadata JSONB`, `status` (`pending|completed|failed`), `source` (`stripe|paypal`), timestamps.
- [x] Optional `orders` table for final state with payment method details, amount, currency, and fulfillment flags.
- [x] Implement TTL cleanup job or cron to mark stale sessions as `abandoned` after e.g. 24h.

### GoHighLevel Sync Mapping
- [x] On `checkout.session.completed`, upsert contact via `/contacts/` with email, name, phone, and lander-specific tags.
- [x] Create/Update opportunity in target pipeline/stage using `offerId` mapping (custom field mapping for Stripe identifiers TBD).
- [x] Trigger workflow by POSTing to `/workflows/<id>/execute` or applying tag configured to auto-start automation.
- [x] Log sync status and retries in `webhook_logs` table (idempotent key: payment intent).

### Error Handling & Observability
- [x] Wrap webhook handler with retries/backoff when calling GHL (retryable on 429/5xx).
- [x] Emit structured logs (`level`, `eventId`, `paymentIntentId`, `status`).
- [x] Plan alerts for repeated failures (threshold via ops notification integration).

## CI Automation
- [x] Add GitHub Actions workflow to sync Stripe pricing on push to main and manual trigger.
- [ ] Configure `STRIPE_SECRET_KEY` repository secret for the workflow.
