# Checkout Baseline Metrics Template

Use this template when capturing pre-rollout metrics for Stripe hosted checkout. Duplicate per snapshot (for example, `checkout-baseline-2025-10-18.md`) and fill in the sections below.

## Context
- **Date range:** <!-- e.g., 2024-09-18 → 2024-10-17 -->
- **Environment:** <!-- Production data unless otherwise noted -->
- **Prepared by:** <!-- Name -->

## PostHog
- **Saved query URL:** <!-- Link to the PostHog insight with filters applied -->
- **Events captured:** `checkout_viewed`, `checkout_session_ready`, `checkout_completed`
- **Breakdowns:** `provider`, `affiliate_id`, `offer_id`
- **Key metrics:**
  - Checkout initiation rate: <!-- e.g., 12.3% -->
  - Completion rate: <!-- e.g., 84.7% -->
  - Recovery emails triggered: <!-- number -->
- **Exports:** Attach CSV export or note storage location.
- **Notes:** <!-- anomalies, segments to watch -->

## Google Analytics / GTM
- **Report URL:** <!-- Link to GA / Looker Studio dashboard -->
- **Events:** `begin_checkout`, `add_payment_info`
- **Segments:** <!-- device, traffic source, campaign -->
- **Key metrics:** <!-- conversion %, drop-off points -->
- **Screenshot:** <!-- optional path or link -->
- **Notes:** <!-- differences vs PostHog, tagging issues -->

## Stripe
- **Dashboard report URL:** <!-- Checkout overview link -->
- **Checkout conversion:** <!-- e.g., 78% -->
- **Abandonment rate:** <!-- percent -->
- **Recovery emails sent:** <!-- count -->
- **Export file:** <!-- path to CSV export -->
- **Notes:** <!-- refund anomalies, pending beta features -->

## Additional Observations
- <!-- Add qualitative callouts, e.g., major campaigns in flight, upcoming pricing changes -->

